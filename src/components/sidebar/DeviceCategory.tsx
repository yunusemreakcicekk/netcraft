import React, { useState } from 'react';
import { DeviceItem } from './DeviceItem';
import type { SidebarDevice } from './sidebarData';

interface DeviceCategoryProps {
    title: string;
    items: SidebarDevice[];
}

export const DeviceCategory: React.FC<DeviceCategoryProps> = ({ title, items }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div style={{ marginBottom: '15px' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 5px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isOpen ? '1px solid #eee' : 'none',
                    marginBottom: isOpen ? '10px' : '0',
                    color: '#555',
                    fontWeight: 'bold',
                    fontSize: '14px'
                }}
            >
                <span>{title}</span>
                <span>{isOpen ? '▼' : '▶'}</span>
            </div>

            {isOpen && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr', // 2 icons per row
                    gap: '10px',
                }}>
                    {items.map((item) => (
                        <DeviceItem
                            key={item.type}
                            type={item.type}
                            label={item.label}
                            icon={item.icon}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
