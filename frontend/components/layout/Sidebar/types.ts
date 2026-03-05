export interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string}>;
    href: string;
    badge?: number;
    requiredPermission?: string;
    dividerBefore?: boolean;
}

export interface NavSection {
    id: string;
    title?: string;
    items: NavItem[];
}