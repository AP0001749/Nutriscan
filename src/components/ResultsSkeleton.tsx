import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Gauge, ListChecks } from 'lucide-react';

export default function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card className="overflow-hidden">
        <CardHeader className="p-6">
          <div className="flex items-center gap-6">
            <div className="w-36 h-36 rounded-full bg-muted/20 flex items-center justify-center shrink-0">
              <Skeleton circle={true} height={80} width={80} />
            </div>
            <div className="flex-1 min-w-0">
              <Skeleton width="60%" height={28} />
              <Skeleton width="90%" height={16} className="mt-3" />
            </div>
            <div className="w-48 shrink-0 hidden sm:block">
              <Skeleton width="80%" height={32} />
              <div className="mt-3 flex gap-2">
                <Skeleton width={80} height={32} />
                <Skeleton width={80} height={32} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h4 className="text-sm text-muted-foreground mb-3 flex items-center"><ListChecks className="h-4 w-4 mr-2"/>Detected Items</h4>
            <div className="flex flex-wrap gap-2">
              <Skeleton width={100} height={28} />
              <Skeleton width={80} height={28} />
              <Skeleton width={120} height={28} />
            </div>
          </div>

          <div>
            <h4 className="text-sm text-muted-foreground mb-3 flex items-center"><Gauge className="h-4 w-4 mr-2"/>Macro Distribution</h4>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className="h-3 bg-muted/40" style={{ width: '60%' }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <Skeleton width={80} height={12} />
              <Skeleton width={80} height={12} />
              <Skeleton width={80} height={12} />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <Skeleton width="60%" height={20} />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Skeleton height={80} containerClassName="w-full" />
                  <Skeleton height={80} containerClassName="w-full" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <Skeleton width="50%" height={20} />
                <div className="mt-3 space-y-3">
                  <Skeleton height={20} containerClassName="w-full" />
                  <Skeleton height={20} containerClassName="w-full" />
                  <Skeleton height={20} containerClassName="w-full" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
