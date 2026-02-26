'use client';

import PermissionGuard from '@/components/PermissionGuard';

export default function QueueLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PermissionGuard module="queue">
            <div className="h-full w-full overflow-hidden">
                {children}
            </div>
        </PermissionGuard>
    );
}
