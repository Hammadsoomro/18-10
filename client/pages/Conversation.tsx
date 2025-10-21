import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MessageCircle,
  Phone,
  Pin,
  Edit,
  Trash2,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  pinned: boolean;
  unreadCount?: number;
}

export default function Conversation() {
  const { token, user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Array<{id:string,content:string,sender:string,createdAt:string}>>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchContacts();
  }, [token]);

  useEffect(() => {
    if (contacts.length > 0 && !selectedContact) {
      setSelectedContact(contacts[0]);
    }
  }, [contacts, selectedContact]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!token || !selectedContact) return;
      try {
        const res = await fetch(`/api/contacts/${selectedContact.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (e) {
        console.error('Messages fetch error', e);
      }
    };
    fetchMessages();
  }, [selectedContact, token]);

  useEffect(() => {
    if (!token) return;
    // connect socket
    const tokenRaw = localStorage.getItem("auth_token");
    try {
      const payload = tokenRaw ? JSON.parse(atob(tokenRaw.split(".")[1])) : null;
      const teamId = payload?.teamId;
      const s = io(undefined, { autoConnect: true });
      socketRef.current = s;
      s.on("connect", () => {
        if (teamId) s.emit("join_team", teamId);
      });

      s.on("sms_received", (data: any) => {
        // data: contactId, phone, name, message, direction, timestamp
        setContacts((prev) => {
          const idx = prev.findIndex((c) => c.id === data.contactId || c.phone === data.phone);
          let updated = [...prev];
          if (idx !== -1) {
            const contact = { ...updated[idx] };
            contact.lastMessage = data.message;
            contact.lastMessageAt = data.timestamp;
            if (selectedContact?.id !== contact.id) {
              contact.unreadCount = (contact.unreadCount || 0) + 1;
            }
            // move to top
            updated.splice(idx, 1);
            updated.unshift(contact);
          } else {
            // new contact
            const contact = {
              id: data.contactId || `phone_${data.phone}`,
              name: data.name || data.phone,
              phone: data.phone,
              lastMessage: data.message,
              lastMessageAt: data.timestamp,
              pinned: false,
              unreadCount: 1,
            } as Contact;
            updated.unshift(contact);
          }
          return updated;
        });

        // toast notification
        toast(`${data.name || data.phone}: ${data.message}`);
      });

      return () => {
        s.disconnect();
      };
    } catch (e) {
      console.error(e);
    }
  }, [token, selectedContact]);

  const fetchContacts = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to fetch contacts");
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContactPhone.trim()) {
      toast.error("Please enter phone");
      return;
    }

    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newContactName || undefined,
          phone: newContactPhone,
        }),
      });

      if (!response.ok) throw new Error("Failed to add contact");
      const data = await response.json();

      setContacts((prev) => [data.contact, ...prev]);
      setNewContactName("");
      setNewContactPhone("");
      toast.success("Contact added");
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete contact");

      setContacts(contacts.filter((c) => c.id !== id));
      if (selectedContact?.id === id) {
        setSelectedContact(null);
      }
      toast.success("Contact deleted");
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    }
  };

  const handleTogglePin = async (contact: Contact) => {
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pinned: !contact.pinned,
        }),
      });

      if (!response.ok) throw new Error("Failed to update contact");

      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, pinned: !c.pinned } : c)),
      );
      toast.success(contact.pinned ? "Unpinned" : "Pinned");
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact");
    }
  };

  const handleSendMessage = async (contact: Contact) => {
    if (!messageText.trim()) return;
    if (!token) return toast.error('Not authenticated');

    try {
      // send message to server which will emit to team
      const res = await fetch(`/api/contacts/${contact.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: messageText, direction: 'outgoing' }),
      });
      if (!res.ok) throw new Error('Failed to send');

      // optimistic update
      setContacts(prev => {
        const idx = prev.findIndex(c => c.id === contact.id);
        const updated = [...prev];
        if (idx !== -1) {
          const ct = { ...updated[idx] };
          ct.lastMessage = messageText;
          ct.lastMessageAt = new Date().toISOString();
          updated.splice(idx,1);
          updated.unshift(ct);
        }
        return updated;
      });

      setMessageText('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to send message');
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery),
  );

  if (isLoading) {
    return (
      <Layout title="Conversation">
        <div className="p-6 flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Conversation">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Contacts List */}
          <Card className="border-slate-200 dark:border-slate-800 lg:col-span-1 flex flex-col sticky top-24 max-h-[calc(100vh-200px)]">
            <CardHeader className="pb-4">
              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Contacts</CardTitle>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Contact name..."
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Phone number..."
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleAddContact}
                    disabled={isAdding}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-2" />
                        Add Contact
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2">
              {filteredContacts.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                  No contacts yet
                </p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      // clear unread
                      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unreadCount: 0 } : c));
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedContact?.id === contact.id
                        ? "bg-blue-100 dark:bg-blue-950"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">
                            {contact.name}
                          </p>
                          {contact.pinned && (
                            <Pin className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <Dialog>
                            <DialogTrigger asChild>
                              <button className="underline text-xs">{contact.phone}</button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Contact</DialogTitle>
                                <DialogDescription>Details</DialogDescription>
                              </DialogHeader>
                              <div>
                                <p className="font-semibold">{contact.name}</p>
                                <p className="text-sm text-slate-500">{contact.phone}</p>
                                {contact.lastMessage && <p className="mt-2">Last: {contact.lastMessage}</p>}
                              </div>
                              <DialogFooter className="mt-4">
                                <Button variant="outline" onClick={() => navigator.clipboard.writeText(contact.phone)}>Copy Phone</Button>
                                <Button onClick={() => setSelectedContact(contact)}>Open Chat</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </p>
                        {contact.lastMessage && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-1">
                            {contact.lastMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        {contact.unreadCount && contact.unreadCount > 0 && (
                          <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-full mb-2">
                            {contact.unreadCount}
                          </div>
                        )}
                        <div className="text-xs text-slate-400">
                          {contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          {selectedContact && (
            <Card className="border-slate-200 dark:border-slate-800 lg:col-span-2 flex flex-col">
              <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-slate-500" />
                      {selectedContact.name}
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedContact.phone}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTogglePin(selectedContact)}
                    >
                      <Pin
                        className={`h-4 w-4 ${selectedContact.pinned ? "text-yellow-500" : ""}`}
                      />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handleDeleteContact(selectedContact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div key={m.id} className={`max-w-[80%] p-3 rounded-lg ${m.sender === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                        <div className="text-sm">{m.content}</div>
                        <div className="text-xs text-slate-400 mt-1 text-right">{new Date(m.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex gap-2">
                  <Input placeholder="Type a message..." value={messageText} onChange={(e)=>setMessageText(e.target.value)} />
                  <Button onClick={()=>handleSendMessage(selectedContact)}>Send</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
