console.log("Userex Companion Background Service Started");

let isRecording = false;

// IndexedDB Helper
const DB_NAME = 'UserexDB';
const STORE_NAME = 'events';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { autoIncrement: true });
            }
        };
    });
}

function addEvent(event: any): Promise<void> {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.add(event);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    });
}

function getAllEvents(): Promise<any[]> {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

function clearEvents(): Promise<void> {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    });
}

// Listen for messages/events
chrome.runtime.onInstalled.addListener(() => {
    console.log("Userex Companion installed");
});

chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender) => {
    if (request.type === 'START_RECORDING') {
        isRecording = true;
        clearEvents().then(() => {
            chrome.storage.local.set({ isRecording: true });
            chrome.action.setBadgeText({ text: 'REC' });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
        });
        return true; // Keep message channel open for async response if needed (though we aren't sending one here)
    }
    else if (request.type === 'STOP_RECORDING') {
        isRecording = false;
        chrome.storage.local.set({ isRecording: false });
        chrome.action.setBadgeText({ text: '' });
    }
    else if (request.type === 'CAPTURE_EVENT') {
        if (!isRecording) return;

        // Capture visible tab
        chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 50 }).then((dataUrl) => {
            const event = {
                ...request.payload,
                timestamp: Date.now(),
                screenshot: dataUrl
            };

            addEvent(event).then(() => {
                // Determine count for badge/status strictly via DB count or just optimistically
                // We'll just notify popup to refresh count
                getAllEvents().then(events => {
                    chrome.runtime.sendMessage({
                        type: 'UPDATE_COUNT',
                        count: events.length
                    }).catch(() => { });
                });
            });
        });
    }
    else if (request.type === 'EXPORT_DATA') {
        // UI/UX Auditor feature has been removed
        console.log('UI/UX Auditor feature has been removed');
        return true;
    }
    else if (request.type === 'GET_COUNT') {
        getAllEvents().then(events => {
            chrome.runtime.sendMessage({ type: 'UPDATE_COUNT', count: events.length }).catch(() => { });
        });
        return true;
    }
    // Autopilot Handlers
    else if (request.type === 'USEREX_DASHBOARD_COMMAND' && request.command === 'START_TEST_SUITE') {
        const suite = request.suite;
        console.log('Starting Test Suite:', suite.name);

        // 1. Open target URL
        // We find the first navigate step or use a default
        const navigateStep = suite.steps.find((s: any) => s.action === 'navigate');
        const url = navigateStep ? navigateStep.target : 'http://www.google.com';

        const dashboardTabId = sender.tab?.id;

        chrome.tabs.create({ url }, (tab) => {
            if (!tab.id) return;
            const tabId = tab.id;
            let executionStarted = false;

            // Wait for load or fallback
            const startExecution = () => {
                if (executionStarted) return;
                executionStarted = true;

                // Ensure tab is active
                chrome.tabs.update(tabId, { active: true }, () => {
                    executeSteps(tabId, suite.steps, dashboardTabId);
                });
            };

            // Listener for load complete
            const listener = (tId: number, info: any) => {
                if (tId === tabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    startExecution();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);

            // Fallback timeout (8s)
            setTimeout(() => {
                if (!executionStarted) {
                    console.log("[Autopilot] Load wait timed out. Forcing execution...");
                    chrome.tabs.onUpdated.removeListener(listener);
                    startExecution();
                }
            }, 8000);
        });
    }
    // New Feature: Open URL and Scan
    else if (request.type === 'USEREX_DASHBOARD_COMMAND' && request.command === 'OPEN_AND_SCAN') {
        const targetUrl = request.url;
        const dashboardTabId = sender.tab?.id;

        const sendLog = (msg: string) => {
            console.log('[Autopilot]', msg);
            // 1. Try sending to Dashboard Tab directly (More reliable)
            if (dashboardTabId) {
                chrome.tabs.sendMessage(dashboardTabId, {
                    type: 'SCAN_LOG',
                    message: msg
                }).catch(() => { });
            }
            // 2. Broadcast fallback
            chrome.runtime.sendMessage({
                type: 'SCAN_LOG',
                message: msg
            }).catch(() => { });
        };

        sendLog(`Opening target: ${targetUrl}`);

        chrome.tabs.create({ url: targetUrl }, (tab) => {
            if (!tab.id) {
                sendLog("Error: Failed to create tab.");
                return;
            }
            const tabId = tab.id;
            let isScanned = false; // Prevent double scanning

            // Timeout Handler (Force scan after 10s if load hangs)
            const timer = setTimeout(() => {
                if (!isScanned) {
                    sendLog("Page load timed out (10s). Forcing scan...");
                    performScan();
                }
            }, 10000);

            const performScan = () => {
                if (isScanned) return;
                isScanned = true;
                clearTimeout(timer);

                sendLog("Scanning page elements...");
                chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (response) => {
                    if (chrome.runtime.lastError) {
                        sendLog("First scan attempt failed. Content script might be loading...");
                        // Retry once
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (retryResponse) => {
                                if (chrome.runtime.lastError) {
                                    sendLog("Scan failed. Try reloading the target page manually.");
                                } else {
                                    sendLog("Scan complete! (Retry success)");
                                    broadcastResult(retryResponse);
                                }
                            });
                        }, 2000);
                    } else {
                        sendLog("Scan complete!");
                        broadcastResult(response);
                    }
                });
            };

            const broadcastResult = (data: any) => {
                if (dashboardTabId) {
                    chrome.tabs.sendMessage(dashboardTabId, { type: 'SCAN_COMPLETE', data: data }).catch(() => { });
                }
                chrome.runtime.sendMessage({ type: 'SCAN_COMPLETE', data: data }).catch(() => { });
            };

            // Wait for load
            chrome.tabs.onUpdated.addListener(function listener(tId, info) {
                if (tId === tabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    sendLog("Page loaded. Waiting for initialization...");

                    // Delay slightly to ensure DOM is ready
                    setTimeout(performScan, 2000);
                }
            });
        });
    }
    // Legacy: Scan Active Page (if user manually navigated)
    else if (request.type === 'USEREX_DASHBOARD_COMMAND' && request.command === 'SCAN_PAGE') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE' }, (response) => {
                    chrome.runtime.sendMessage({
                        type: 'SCAN_COMPLETE',
                        data: response
                    }).catch(() => { });
                });
            }
        });
    }
});

async function executeSteps(tabId: number, steps: any[], dashboardTabId?: number) {
    let allPassed = true;
    let errorDetails = "";

    const reportToDashboard = (status: 'passed' | 'failed' | 'running', stepIndex?: number, error?: string) => {
        if (!dashboardTabId) return;
        chrome.tabs.sendMessage(dashboardTabId, {
            type: 'TEST_SUITE_UPDATE',
            status: status,
            stepIndex: stepIndex,
            error: error
        }).catch(() => { });
    };

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Handle Navigate Special Case
        if (step.action === 'navigate') {
            reportToDashboard('passed', i);
            await new Promise(r => setTimeout(r, 1000)); // Small pause to show success
            continue;
        }

        console.log(`Executing Step ${i + 1}:`, step);
        reportToDashboard('running', i);

        try {
            const result = await new Promise<any>((resolve) => {
                chrome.tabs.sendMessage(tabId, {
                    type: 'EXECUTE_ACTION',
                    action: step
                }, (response) => {
                    // Handle potential connection errors (e.g. tab closed)
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        resolve(response || { success: false, error: "No response from content script" });
                    }
                });
            });

            if (!result.success) {
                console.error(`Step ${i + 1} Failed:`, result.error);
                allPassed = false;
                errorDetails = result.error;
                reportToDashboard('failed', i, errorDetails);
                break; // Stop execution on failure
            }

            // Wait a bit for UI to settle visually
            await new Promise(r => setTimeout(r, 1000));

        } catch (e: any) {
            allPassed = false;
            errorDetails = e.message;
            reportToDashboard('failed', i, errorDetails);
            break;
        }
    }

    console.log('Test Suite Completed. Result:', allPassed ? 'PASS' : 'FAIL');

    // Final Report
    if (dashboardTabId) {
        chrome.tabs.sendMessage(dashboardTabId, {
            type: 'TEST_SUITE_COMPLETE',
            success: allPassed,
            error: errorDetails
        }).catch(() => { });
    }
}
