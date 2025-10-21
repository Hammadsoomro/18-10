import { RequestHandler } from "express";
import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User, Contact } from "../db";

export const handleGetContacts: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const contacts = await Contact.find({ userId: user._id }).sort({
      pinned: -1,
      lastMessageAt: -1,
      createdAt: -1,
    });

    const formattedContacts = contacts.map((contact: any) => ({
      id: contact._id.toString(),
      name: contact.name || contact.phone,
      phone: contact.phone,
      pinned: contact.pinned,
      lastMessage: contact.lastMessage || null,
      lastMessageAt: contact.lastMessageAt || null,
      unreadCount: contact.unreadCount || 0,
    }));

    res.json({ contacts: formattedContacts });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({ error: "Failed to get contacts" });
  }
};

export const handleCreateContact: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { name, phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    const contact = new Contact({
      userId: user._id,
      name: name || phone,
      phone,
      pinned: false,
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
    });

    await contact.save();

    res.json({
      contact: {
        id: contact._id.toString(),
        name: contact.name,
        phone: contact.phone,
        pinned: contact.pinned,
        lastMessage: contact.lastMessage,
        unreadCount: contact.unreadCount,
      },
    });
  } catch (error) {
    console.error("Create contact error:", error);
    res.status(500).json({ error: "Failed to create contact" });
  }
};

export const handleUpdateContact: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { id } = req.params;
    const { name, phone, pinned } = req.body;

    const contact = await Contact.findOne({
      _id: id,
      userId: user._id,
    });

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (name) contact.name = name;
    if (phone) contact.phone = phone;
    if (typeof pinned === "boolean") contact.pinned = pinned;

    await contact.save();

    res.json({
      contact: {
        id: contact._id.toString(),
        name: contact.name,
        phone: contact.phone,
        pinned: contact.pinned,
        lastMessage: contact.lastMessage,
        unreadCount: contact.unreadCount || 0,
      },
    });
  } catch (error) {
    console.error("Update contact error:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
};

export const handleDeleteContact: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { id } = req.params;

    const contact = await Contact.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
};

export const handleSendMessage: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { id } = req.params;
    const { message, direction } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const contact = await Contact.findOne({ _id: id, userId: user._id });
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    // Update last message and timestamp
    contact.lastMessage = message;
    contact.lastMessageAt = new Date();
    if (direction === 'incoming') {
      contact.unreadCount = (contact.unreadCount || 0) + 1;
    }
    await contact.save();

    // Emit socket event if server has io attached
    try {
      const app: any = req.app;
      const io = app.get('io');
      if (io) {
        io.to(`team_${user.teamId}`).emit('sms_received', {
          contactId: contact._id.toString(),
          phone: contact.phone,
          name: contact.name,
          message,
          direction: direction || 'incoming',
          timestamp: contact.lastMessageAt,
        });
      }
    } catch (e) {
      console.error('Emit sms error', e);
    }

    res.json({ message: 'Message sent' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
