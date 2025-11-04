'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  FileText,
  Database,
  Activity,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebarCollapsed, useAdminStore } from '@/stores/useAdminStore';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Templates',
    href: '/admin/templates',
    icon: FileText,
  },
  {
    title: 'Data Pools',
    href: '/admin/data-pools',
    icon: Database,
    children: [
      {
        title: 'Experiences',
        href: '/admin/data-pools/experiences',
        icon: Database,
      },
      {
        title: 'Archetypes',
        href: '/admin/data-pools/archetypes',
        icon: Database,
      },
      {
        title: 'Visual Elements',
        href: '/admin/data-pools/visuals',
        icon: Database,
      },
    ],
  },
  {
    title: 'Monitoring',
    href: '/admin/monitoring',
    icon: Activity,
  },
  {
    title: 'Agent Control',
    href: '/admin/agent',
    icon: Play,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const toggleSidebar = useAdminStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center space-x-2">
              <span className="text-xl font-bold">Knock Admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn('h-8 w-8', collapsed && 'mx-auto')}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4">
          {!collapsed ? (
            <div className="space-y-2 text-xs text-muted-foreground">
              <div>Version 1.0.0</div>
              <div>© 2025 Knock</div>
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground">v1.0</div>
          )}
        </div>
      </div>
    </aside>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  depth?: number;
}

function NavItemComponent({
  item,
  pathname,
  collapsed,
  depth = 0,
}: NavItemComponentProps) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren && !collapsed) {
    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            isActive && 'bg-accent text-accent-foreground',
            depth > 0 && 'pl-6'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="flex-1">{item.title}</span>}
          {item.badge && !collapsed && (
            <Badge variant="secondary" className="ml-auto">
              {item.badge}
            </Badge>
          )}
        </div>
        <div className="ml-4 mt-1 space-y-1">
          {item.children?.map((child) => (
            <NavItemComponent
              key={child.href}
              item={child}
              pathname={pathname}
              collapsed={collapsed}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground',
        depth > 0 && !collapsed && 'pl-6',
        collapsed && 'justify-center'
      )}
      title={collapsed ? item.title : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
}
