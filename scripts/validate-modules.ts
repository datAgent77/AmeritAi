/**
 * Module Validation Script
 * 
 * Validates the consistency of all modules in the registry:
 * - Checks for required fields
 * - Validates aiSystemInstruction has both EN and TR
 * - Verifies status values are valid
 * - Reports potential issues
 * 
 * Usage: npx ts-node scripts/validate-modules.ts
 */

import { MODULES_REGISTRY, getAllModules, ModuleDefinition } from '../lib/modules-registry';

interface ValidationIssue {
    moduleId: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
}

function validateModules(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const modules = getAllModules();

    console.log(`\n📦 Validating ${modules.length} modules...\n`);

    for (const mod of modules) {
        // 1. Check legacyFirestoreField for non-core modules
        if (!mod.isCore && !mod.legacyFirestoreField) {
            issues.push({
                moduleId: mod.id,
                severity: 'error',
                message: `Non-core module missing 'legacyFirestoreField' - toggle won't work!`
            });
        }

        // 2. Check aiSystemInstruction completeness
        if (mod.aiSystemInstruction) {
            if (!mod.aiSystemInstruction.en) {
                issues.push({
                    moduleId: mod.id,
                    severity: 'error',
                    message: `aiSystemInstruction missing 'en' translation`
                });
            }
            if (!mod.aiSystemInstruction.tr) {
                issues.push({
                    moduleId: mod.id,
                    severity: 'error',
                    message: `aiSystemInstruction missing 'tr' translation`
                });
            }
        }

        // 3. Warn about modules with AI impact but no instruction
        const modulesNeedingInstruction = ['productCatalog', 'salesOptimization', 'visualDiagnosis', 'digitalWaiter', 'dynamicContext'];
        if (modulesNeedingInstruction.includes(mod.id) && !mod.aiSystemInstruction) {
            issues.push({
                moduleId: mod.id,
                severity: 'warning',
                message: `Module affects AI behavior but has no 'aiSystemInstruction'`
            });
        }

        // 4. Validate status
        const validStatuses = ['ready', 'beta', 'coming_soon'];
        if (!validStatuses.includes(mod.status)) {
            issues.push({
                moduleId: mod.id,
                severity: 'error',
                message: `Invalid status '${mod.status}' - must be: ${validStatuses.join(', ')}`
            });
        }

        // 5. Info: Modules that are coming_soon
        if (mod.status === 'coming_soon' && mod.aiSystemInstruction) {
            issues.push({
                moduleId: mod.id,
                severity: 'info',
                message: `Module is 'coming_soon' but has aiSystemInstruction - will be skipped`
            });
        }

        // 6. Check name and description completeness
        if (!mod.name.en || !mod.name.tr) {
            issues.push({
                moduleId: mod.id,
                severity: 'error',
                message: `Module name missing translation (en: ${!!mod.name.en}, tr: ${!!mod.name.tr})`
            });
        }

        if (!mod.description.en || !mod.description.tr) {
            issues.push({
                moduleId: mod.id,
                severity: 'error',
                message: `Module description missing translation`
            });
        }

        // 7. Validate supported sectors are valid
        const validSectors = [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service',
            'healthcare', 'education', 'academic', 'finance', 'restaurant',
            'agriculture', 'automotive', 'insurance', 'logistics', 'beauty',
            'legal', 'fitness', 'maritime', 'manufacturing', 'other'
        ];
        
        for (const sector of mod.supportedSectors) {
            if (!validSectors.includes(sector)) {
                issues.push({
                    moduleId: mod.id,
                    severity: 'error',
                    message: `Invalid sector '${sector}' in supportedSectors`
                });
            }
        }
    }

    return issues;
}

function printResults(issues: ValidationIssue[]) {
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
        console.log('❌ ERRORS:');
        errors.forEach(i => console.log(`  [${i.moduleId}] ${i.message}`));
        console.log();
    }

    if (warnings.length > 0) {
        console.log('⚠️  WARNINGS:');
        warnings.forEach(i => console.log(`  [${i.moduleId}] ${i.message}`));
        console.log();
    }

    if (infos.length > 0) {
        console.log('ℹ️  INFO:');
        infos.forEach(i => console.log(`  [${i.moduleId}] ${i.message}`));
        console.log();
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Summary: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info`);
    
    if (errors.length === 0) {
        console.log('✅ All critical validations passed!\n');
        return 0;
    } else {
        console.log('❌ Fix errors before deployment!\n');
        return 1;
    }
}

// Run validation
const issues = validateModules();
const exitCode = printResults(issues);
process.exit(exitCode);
