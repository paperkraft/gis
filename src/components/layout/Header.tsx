"use client";
import { Droplet, Moon, User } from "lucide-react";
import React from "react";

import { Button } from "../ui/button";

export function Header() {
  return (
    <header className="h-14 border-b bg-white dark:bg-gray-900 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Droplet className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Water Network GIS
        </h1>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          Beta Edition
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Moon className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
        <span className="text-sm text-gray-700 dark:text-gray-300">Admin</span>
      </div>
    </header>
  );
}
