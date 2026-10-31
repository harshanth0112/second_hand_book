import { ChatService } from '../services/chat.service.js';

export class ChatController {
  static async startConversation(req, res, next) {
    try {
      const conv = await ChatService.startConversation(req.user._id, req.body.listingId);
      return res.status(200).json(conv);
    } catch (err) {
      next(err);
    }
  }

  static async getInbox(req, res, next) {
    try {
      const inbox = await ChatService.getInbox(req.user._id);
      return res.status(200).json(inbox);
    } catch (err) {
      next(err);
    }
  }

  static async getMessages(req, res, next) {
    try {
      const messages = await ChatService.getMessages(req.params.id, req.user._id, req.query);
      return res.status(200).json(messages);
    } catch (err) {
      next(err);
    }
  }

  static async markRead(req, res, next) {
    try {
      await ChatService.markRead(req.params.id, req.user._id);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  static async handleOffer(req, res, next) {
    try {
      const result = await ChatService.handleOffer(req.params.id, req.user._id, req.body.action);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

