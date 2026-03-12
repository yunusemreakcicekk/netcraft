// import { DeviceType } from '../../types/models'; // Unused


export interface SidebarDevice {
    type: string; // Using string to be compatible with existing Drag logic which uses string
    label: string;
    icon: string;
}

export interface SidebarCategory {
    title: string;
    items: SidebarDevice[];
}

export const sidebarData: SidebarCategory[] = [
    {
        title: "End Devices",
        items: [
            { type: "PC", label: "PC", icon: "/assets/icons/pc.png" },
            { type: "Laptop", label: "Laptop", icon: "/assets/icons/laptop.png" },
            { type: "Server", label: "Server", icon: "/assets/icons/server.png" },
            { type: "Printer", label: "Printer", icon: "/assets/icons/printer.png" },
        ]
    },
    {
        title: "Network Devices",
        items: [
            { type: "Router", label: "Router", icon: "/assets/icons/router.png" },
            { type: "Switch", label: "Switch", icon: "/assets/icons/switch.png" },
            { type: "Firewall", label: "Firewall", icon: "/assets/icons/firewall.png" },
            { type: "Modem", label: "Modem", icon: "/assets/icons/modem.png" },
            { type: "Internet", label: "Internet Cloud", icon: "/assets/icons/internet_cloud.png" },
            { type: "AccessPoint", label: "Access Point", icon: "/assets/icons/access_point.png" },
        ]
    }
];
