"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboard, PhoneCall, Bot, Settings, CreditCard, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/clients/supabase"
import { Button } from "@/components/ui/button"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & metrics"
  },
  {
    title: "Service Calls",
    url: "/calls",
    icon: PhoneCall,
    description: "All incoming calls"
  },
  {
    title: "AI Receptionist",
    url: "/ai-receptionist",
    icon: Bot,
    description: "Configure AI agent"
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "Business configuration"
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
    description: "Subscription & usage"
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = React.useMemo(() => {
    if (typeof window === "undefined") return null
    return createBrowserClient()
  }, [])

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Sidebar className="border-r border-[#E2E8F0] bg-white">
      <SidebarHeader className="border-b border-[#E2E8F0] px-6 py-6">
        <Link href="/dashboard" className="flex items-center justify-center">
          <img
            src="/logo.png"
            alt="AirDesk"
            className="h-16 w-auto"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== '/dashboard' && item.url !== '/settings' && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={isActive}
                      className={`h-14 px-4 rounded-lg transition-all ${
                        isActive 
                          ? '!bg-[#1E40AF] !text-white shadow-md' 
                          : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#1E40AF]'
                      }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? '!text-white' : 'text-[#475569]'}`} />
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className={`font-semibold text-sm ${isActive ? '!text-white' : 'text-[#1F2937]'}`}>{item.title}</span>
                          <span className={`text-xs ${isActive ? '!text-white' : 'text-[#475569]'}`}>
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 pb-4">
        <SidebarSeparator className="my-2" />
        <Button
          type="button"
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start h-12 px-4 rounded-lg text-[#475569] hover:text-[#DC2626] hover:bg-[#F1F5F9]"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span className="text-sm font-semibold">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
