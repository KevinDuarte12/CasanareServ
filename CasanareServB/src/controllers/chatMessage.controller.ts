import { Request, Response } from 'express';
import ChatMessage from '../db/models/chatMessage';
import User from '../db/models/user';

// Utilidad para bloquear teléfonos y emails
function containsBlockedInfo(text: string): boolean {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(\+?\d{1,3})?[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
  return emailRegex.test(text) || phoneRegex.test(text);
}

// Enviar mensaje (para trueque o producto)
export const sendMessage = async (req: Request, res: Response) => {
  const { id_barter, id_product, id_user, message, image_url } = req.body;
  console.log('Datos recibidos en el servidor:', req.body);

  // Verificar que tenemos usuario y un producto/trueque
  if (!id_user) {
    return res.status(400).json({ msg: 'Se requiere id_user' });
  }

  if (!id_barter && !id_product) {
    return res.status(400).json({ msg: 'Se requiere id_product o id_barter' });
  }

  // Verificar que hay mensaje o imagen
  if (!message && !image_url && !req.file) {
    return res.status(400).json({ msg: 'Mensaje o imagen requerido' });
  }

  if (message && containsBlockedInfo(message)) {
    return res.status(400).json({ msg: 'No se permite enviar teléfonos ni emails' });
  }

  try {
    const chatMessage = await ChatMessage.create({
      id_barter: id_barter || null,
      id_product: id_product || null,
      id_user,
      message,
      image_url,
      sent_at: new Date(),
    });
    res.json(chatMessage);
  } catch (error) {
    res.status(500).json({ msg: 'Error al enviar mensaje', error });
  }
};

// Obtener mensajes por trueque
export const getMessagesByBarter = async (req: Request, res: Response) => {
  const { id_barter } = req.params;
  try {
    const messages = await ChatMessage.findAll({
      where: { id_barter },
      order: [['sent_at', 'ASC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener mensajes', error });
  }
};

// Obtener mensajes por producto
export const getMessagesByProduct = async (req: Request, res: Response) => {
  const { id_product } = req.params;
  console.log(`Recibida petición para mensajes del producto ${id_product}`);
  
  try {
    const messages = await ChatMessage.findAll({
      where: { id_product },
      order: [['sent_at', 'ASC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
    });
    console.log(`Encontrados ${messages.length} mensajes`);
    res.json(messages);
  } catch (error) {
    console.error(`Error al obtener mensajes: ${error}`);
    res.status(500).json({ msg: 'Error al obtener mensajes', error });
  }
};