import { SiteLogo } from "@/components/svg";
import { useSidebar, useThemeStore } from "@/store";
import Link from "next/link";
import React from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SidebarLogo = ({ hovered }) => {
  const { sidebarType, setCollapsed, collapsed } = useSidebar();
  const { layout } = useThemeStore();
  
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className={collapsed ? "flex-1 flex justify-center" : "flex-1"}>
          <Link href="/dashboard" className="flex items-center gap-x-3">
            <SiteLogo className="text-primary" />
            {!collapsed && (
              <span className="font-semibold text-sm text-foreground hidden sm:block">
                TUCS DIGITAL
              </span>
            )}
          </Link>
        </div>
        
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 hover:bg-muted"
            title="Colapsar sidebar"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        
        {collapsed && (
          <div className="w-full flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 hover:bg-muted"
              title="Expandir sidebar"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarLogo;
