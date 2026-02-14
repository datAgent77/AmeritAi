
import { useCallback, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TestRun } from "@/lib/services/test-run-service";
import { useAuth } from "@/context/AuthContext";

interface RunHistoryTableProps {
    onViewDetail: (run: TestRun) => void;
}

export function RunHistoryTable({ onViewDetail }: RunHistoryTableProps) {
    const [runs, setRuns] = useState<TestRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    const fetchRuns = useCallback(async () => {
        if (!user) {
            setRuns([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/autopilot/runs', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setRuns(data.runs);
            } else {
                setRuns([]);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
            setRuns([]);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRuns();
    }, [fetchRuns]);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    }

    if (runs.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No test history found.</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Test Suite</TableHead>
                        <TableHead>Target URL</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {runs.map((run) => (
                        <TableRow key={run.id}>
                            <TableCell>
                                <Badge variant={run.status === 'passed' ? 'default' : 'destructive'} className={run.status === 'passed' ? 'bg-green-600' : ''}>
                                    {run.status.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{run.testSuiteName || 'Unnamed Suite'}</TableCell>
                            <TableCell>
                                <a href={run.url} target="_blank" rel="noreferrer" className="flex items-center hover:underline text-muted-foreground text-xs">
                                    {run.url.slice(0, 30)}... <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {formatDistanceToNow(run.timestamp, { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => onViewDetail(run)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Details
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
