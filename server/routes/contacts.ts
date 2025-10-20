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
      createdAt: -1,
    });

    const formattedContacts = contacts.map((contact: any) => ({
      id: contact._id.toString(),
      name: contact.name,
      phone: contact.phone,
      pinned: contact.pinned,
      lastMessage: contact.lastMessage,
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

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    const contact = new Contact({
      userId: user._id,
      name,
      phone,
      pinned: false,
    });

    await contact.save();

    res.json({
      contact: {
        id: contact._id.toString(),
        name: contact.name,
        phone: contact.phone,
        pinned: contact.pinned,
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
