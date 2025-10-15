import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Gauge, ListChecks } from 'lucide-react';

export default function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card>
        <CardHeader className="p-6">
          <div className="flex items-center gap-6">
            <div className="w-36 h-36 rounded-full bg-muted/20 flex items-center justify-center">
              <Skeleton circle={true} height={80} width={80} />
            </div>
            <div className="flex-1">
              <Skeleton width={240} height={28} />
              <Skeleton width={380} height={16} className="mt-3" />
            </div>
            <div className="w-48">
              <Skeleton width={140} height={32} />
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
            <div className="flex gap-2">
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
            <div className="flex gap-6">
              <div className="w-1/2">
                <Skeleton width={160} height={20} />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Skeleton height={80} />
                  <Skeleton height={80} />
                </div>
              </div>
              <div className="w-1/2">
                <Skeleton width={120} height={20} />
                <div className="mt-3 space-y-3">
                  <Skeleton height={20} />
                  <Skeleton height={20} />
                  <Skeleton height={20} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
