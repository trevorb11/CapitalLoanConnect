import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone, PhoneCall, PhoneOff, Clock, Send, MessageSquare, Tag,
  ChevronDown, ChevronUp, Loader2, Trash2, User, ExternalLink,
} from "lucide-react";

// ── Call History ──────────────────────────────────────────────────────────────

interface CallRecord {
  id: string;
  rep_name: string;
  direction: string;
  duration: number;
  caller_number: string;
  callee_number: string;
  caller_name: string;
  callee_name: string;
  result: string;
  start_time: string;
  end_time: string;
}

function formatCallDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatCallTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isConnected(result: string): boolean {
  return /connected|answered/i.test(result || '');
}

export function CallHistory({ phone }: { phone: string }) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded || loaded || !phone) return;
    setLoading(true);
    fetch(`/api/merchant-profile/calls/${encodeURIComponent(phone)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { calls: [] })
      .then(d => setCalls(d.calls || []))
      .catch(() => {})
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [phone, expanded, loaded]);

  if (!phone) return null;

  const connected = calls.filter(c => isConnected(c.result)).length;
  const total = calls.length;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="text-xs text-purple-600 hover:text-purple-500 font-medium flex items-center gap-1"
      >
        <Phone className="h-3 w-3" />
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Call History
        {loaded && <span className="text-gray-400 ml-1">({connected}/{total} connected)</span>}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border bg-white overflow-hidden">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 p-4 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading calls...
            </div>
          )}

          {loaded && calls.length === 0 && (
            <p className="text-xs text-gray-400 p-4">No call history found for this number.</p>
          )}

          {loaded && calls.length > 0 && (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {calls.map(call => (
                <div key={call.id} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-gray-50">
                  {/* Direction icon */}
                  <div className="shrink-0">
                    {isConnected(call.result) ? (
                      <PhoneCall className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <PhoneOff className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">{call.rep_name || 'Unknown'}</span>
                      <span className="text-gray-400">{call.direction}</span>
                      {call.duration > 0 && (
                        <span className="text-gray-500 flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {formatCallDuration(call.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Result badge */}
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      isConnected(call.result)
                        ? 'border-green-300 text-green-600'
                        : 'border-gray-300 text-gray-500'
                    }`}
                  >
                    {call.result || 'unknown'}
                  </Badge>

                  {/* Time */}
                  <span className="text-gray-400 shrink-0 whitespace-nowrap">
                    {formatCallTime(call.start_time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Merchant Notes ───────────────────────────────────────────────────────────

interface Note {
  id: number;
  note: string;
  author_name: string;
  author_email: string;
  created_at: string;
}

export function MerchantNotes({ email, businessName }: { email: string; businessName?: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!expanded || loaded || !email) return;
    setLoading(true);
    fetch(`/api/merchant-profile/notes/${encodeURIComponent(email)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(d => setNotes(d.notes || []))
      .catch(() => {})
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [email, expanded, loaded]);

  const addNote = async () => {
    if (!newNote.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/merchant-profile/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, businessName, note: newNote.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.note) setNotes(prev => [data.note, ...prev]);
        setNewNote('');
      }
    } catch {}
    setSaving(false);
  };

  if (!email) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="text-xs text-amber-600 hover:text-amber-500 font-medium flex items-center gap-1"
      >
        <MessageSquare className="h-3 w-3" />
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Notes
        {loaded && notes.length > 0 && <span className="text-gray-400 ml-1">({notes.length})</span>}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border bg-white overflow-hidden">
          {/* Add note form */}
          <div className="p-3 border-b bg-gray-50">
            <Textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="text-xs resize-none mb-2"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  addNote();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Ctrl+Enter to save</span>
              <Button size="sm" className="h-7 text-xs" onClick={addNote} disabled={saving || !newNote.trim()}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Add Note
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 p-4 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading notes...
            </div>
          )}

          {loaded && notes.length === 0 && (
            <p className="text-xs text-gray-400 p-4">No notes yet. Add the first one above.</p>
          )}

          {notes.length > 0 && (
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {notes.map(n => (
                <div key={n.id} className="px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="font-medium text-gray-700">{n.author_name}</span>
                    <span className="text-gray-400">
                      {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' '}
                      {new Date(n.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{n.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── GHL Pipeline Stage ───────────────────────────────────────────────────────

interface GHLData {
  found: boolean;
  contactId?: string;
  contactName?: string;
  tags?: string[];
  pipelineStage?: string;
  opportunityName?: string;
  opportunityStatus?: string;
  opportunityValue?: number;
  lastActivity?: string;
}

export function GHLPipelineStatus({ email }: { email: string }) {
  const [data, setData] = useState<GHLData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded || loaded || !email) return;
    setLoading(true);
    fetch(`/api/merchant-profile/ghl/${encodeURIComponent(email)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [email, expanded, loaded]);

  if (!email) return null;

  const statusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    const s = status.toLowerCase();
    if (s === 'won' || s === 'funded') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (s === 'lost' || s === 'declined') return 'bg-red-100 text-red-700 border-red-300';
    if (s === 'open' || s === 'active') return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-amber-100 text-amber-700 border-amber-300';
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="text-xs text-teal-600 hover:text-teal-500 font-medium flex items-center gap-1"
      >
        <ExternalLink className="h-3 w-3" />
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        CRM Status
        {loaded && data?.found && data.opportunityStatus && (
          <Badge variant="outline" className={`text-[10px] ml-1 ${statusColor(data.opportunityStatus)}`}>
            {data.opportunityStatus}
          </Badge>
        )}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border bg-white overflow-hidden">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 p-4 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Looking up in GHL...
            </div>
          )}

          {loaded && !data?.found && (
            <p className="text-xs text-gray-400 p-4">Not found in GHL CRM.</p>
          )}

          {loaded && data?.found && (
            <div className="p-3 space-y-2 text-xs">
              {/* Opportunity info */}
              {data.opportunityName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Opportunity:</span>
                  <span className="font-medium text-gray-700">{data.opportunityName}</span>
                </div>
              )}
              {data.opportunityStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Stage:</span>
                  <Badge variant="outline" className={`text-[10px] ${statusColor(data.opportunityStatus)}`}>
                    {data.opportunityStatus}
                  </Badge>
                </div>
              )}
              {data.opportunityValue && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Value:</span>
                  <span className="font-medium text-gray-700">${Number(data.opportunityValue).toLocaleString()}</span>
                </div>
              )}

              {/* Tags */}
              {data.tags && data.tags.length > 0 && (
                <div>
                  <span className="text-gray-500 block mb-1">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {data.tags.slice(0, 10).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        <Tag className="h-2.5 w-2.5 mr-0.5" /> {tag}
                      </Badge>
                    ))}
                    {data.tags.length > 10 && (
                      <span className="text-gray-400 text-[10px]">+{data.tags.length - 10} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Last activity */}
              {data.lastActivity && (
                <div className="flex items-center justify-between text-gray-400 pt-1 border-t border-gray-100">
                  <span>Last activity:</span>
                  <span>{new Date(data.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
