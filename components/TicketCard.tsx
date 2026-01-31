'use client';

import { Phone, MapPin, MoreVertical, Trash2 } from 'lucide-react';
import { Ticket, TicketPriority } from './DispatchBoard';
import { useState } from 'react';

interface TicketCardProps {
  ticket: Ticket;
  isDragging?: boolean;
  isMoving?: boolean;
  onStatusChange?: (newStatus: Ticket['status']) => void;
  onDelete?: (ticketId: string) => void;
  showMobileMenu?: boolean;
  isMobile?: boolean;
}

export default function TicketCard({
  ticket,
  isDragging = false,
  isMoving = false,
  onStatusChange,
  onDelete,
  showMobileMenu = false,
  isMobile = false,
}: TicketCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const priorityColors = {
    URGENT: { bg: '#F97316', text: 'white' },
    NORMAL: { bg: '#1E40AF', text: 'white' },
  };

  const formatPhone = (phone?: string): string => {
    if (!phone || phone === 'Not provided') return '';
    const cleaned = phone.replace(/[^\d+]/g, '');
    const usMatch = cleaned.match(/^\+?1?(\d{10})$/);
    if (usMatch) {
      const digits = usMatch[1];
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    return phone;
  };

  const formatAddress = (): string => {
    const parts: string[] = [];
    if (ticket.addressLine1) parts.push(ticket.addressLine1);
    if (ticket.city) parts.push(ticket.city);
    if (ticket.state) parts.push(ticket.state);
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const getMapsLink = (): string => {
    const address = formatAddress();
    if (!address) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const getTelLink = (): string => {
    if (!ticket.callerPhone || ticket.callerPhone === 'Not provided') return '';
    const cleaned = ticket.callerPhone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) return `tel:${cleaned}`;
    if (cleaned.match(/^1\d{10}$/)) return `tel:+${cleaned}`;
    if (cleaned.match(/^\d{10}$/)) return `tel:+1${cleaned}`;
    return `tel:${cleaned}`;
  };

  const callerName = ticket.callerName || 'Unknown caller';
  const location = ticket.city && ticket.state 
    ? `${ticket.city}, ${ticket.state}`
    : ticket.city || ticket.state || '';
  const requestedTime = ticket.requestedWindow || 'Scheduling TBD';
  const phoneFormatted = formatPhone(ticket.callerPhone);
  const address = formatAddress();
  const mapsLink = getMapsLink();
  const telLink = getTelLink();

  const priorityColor = priorityColors[ticket.priority];

  return (
    <div
      className={`bg-white rounded-lg p-4 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${isMoving ? 'opacity-50' : ''}`}
    >
      {/* Priority Pill */}
      <div className="flex items-start justify-between mb-3">
        <span
          className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}
        >
          {ticket.priority}
        </span>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-[#F1F5F9] rounded"
          >
            <MoreVertical className="w-4 h-4 text-[#475569]" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10 min-w-[160px]">
              <div className="py-1">
                {onStatusChange && (['READY', 'DISPATCHED', 'COMPLETED'] as const)
                  .filter(status => status !== ticket.status)
                  .map(status => (
                    <button
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(status);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#475569] hover:bg-[#F1F5F9]"
                    >
                      Move to {status}
                    </button>
                  ))}
                {onDelete && (
                  <>
                    {onStatusChange && (['READY', 'DISPATCHED', 'COMPLETED'] as const).filter(status => status !== ticket.status).length > 0 && (
                      <div className="border-t border-[#E2E8F0] my-1" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
                          onDelete(ticket.id);
                        }
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#DC2626] hover:bg-[#FEE2E2] flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="mb-3">
        <h4 className="font-semibold text-[#1F2937] mb-1">{ticket.issueCategory}</h4>
        <div className="text-sm text-[#475569]">
          <div className="font-medium">{callerName}</div>
          {location && <div className="text-[#94A3B8]">{location}</div>}
        </div>
      </div>

      {/* Requested Time */}
      <div className="text-xs text-[#94A3B8] mb-3">
        {requestedTime}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#E2E8F0]">
        {telLink && (
          <a
            href={telLink}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-[#1E40AF] hover:bg-[#1E40AF]/10 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Call</span>
          </a>
        )}
        {mapsLink && (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-[#059669] hover:bg-[#059669]/10 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Map</span>
          </a>
        )}
      </div>
    </div>
  );
}
