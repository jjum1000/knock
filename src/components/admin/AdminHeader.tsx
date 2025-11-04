'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Settings } from 'lucide-react';
import { useSidebarCollapsed } from '@/stores/useAdminStore';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Admin', href: '/admin' },
  ];

  if (segments.length > 1) {
    const secondSegment = segments[1];
    const titleMap: Record<string, string> = {
      'templates': 'Templates',
      'data-pools': 'Data Pools',
      'monitoring': 'Monitoring',
      'agent': 'Agent Control',
    };

    breadcrumbs.push({
      label: titleMap[secondSegment] || secondSegment.charAt(0).toUpperCase() + secondSegment.slice(1),
      href: `/admin/${secondSegment}`,
    });

    if (segments.length > 2) {
      const thirdSegment = segments[2];
      const dataPoolTitleMap: Record<string, string> = {
        'experiences': 'Experiences',
        'archetypes': 'Archetypes',
        'visuals': 'Visual Elements',
      };

      breadcrumbs.push({
        label: dataPoolTitleMap[thirdSegment] || thirdSegment,
      });
    }
  }

  return breadcrumbs;
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useSidebarCollapsed();
  const breadcrumbs = getBreadcrumbs(pathname);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
  };

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 h-16 border-b bg-background transition-all duration-300',
        collapsed ? 'left-16' : 'left-64'
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <span className="mx-2 text-muted-foreground">/</span>}
              {item.href ? (
                <a
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span className="font-medium">{item.label}</span>
              )}
            </div>
          ))}
        </nav>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@knock.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
