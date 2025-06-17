/**
 * Controlador para gestión de direcciones de entrega
 * Maneja operaciones CRUD de direcciones de usuarios para envíos y entregas
 */
import { Request, Response } from 'express';
import DeliveryAddress from '../db/models/deliveryAddress';

// Obtener todas las direcciones de un usuario
export const getUserAddresses = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        
        const addresses = await DeliveryAddress.findAll({
            where: { user_id: userId },
            order: [
                ['is_default', 'DESC'], // Primero las direcciones predeterminadas
                ['createdAt', 'DESC']   // Luego ordenadas por fecha de creación
            ]
        });
        
        res.json(addresses);
    } catch (error: any) {
        console.error('Error al obtener direcciones:', error);
        res.status(500).json({
            msg: 'Error al obtener direcciones',
            error: error.message
        });
    }
};

// Obtener una dirección específica
export const getAddressById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.params.userId;
        
        const address = await DeliveryAddress.findOne({
            where: { 
                id,
                user_id: userId
            }
        });
        
        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }
        
        res.json(address);
    } catch (error: any) {
        console.error('Error al obtener dirección:', error);
        res.status(500).json({
            msg: 'Error al obtener dirección',
            error: error.message
        });
    }
};

// Crear una nueva dirección
export const createAddress = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        const addressData = req.body;
        
        // Asignar el user_id desde la ruta
        addressData.user_id = userId;
        
        const newAddress = await DeliveryAddress.create(addressData);
        
        res.status(201).json({
            msg: 'Dirección creada correctamente',
            address: newAddress
        });
    } catch (error: any) {
        console.error('Error al crear dirección:', error);
        res.status(500).json({
            msg: 'Error al crear dirección',
            error: error.message
        });
    }
};

// Actualizar una dirección existente
export const updateAddress = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.params.userId;
        const addressData = req.body;
        
        // Verificar que la dirección exista y pertenezca al usuario
        const address = await DeliveryAddress.findOne({
            where: { 
                id,
                user_id: userId
            }
        });
        
        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }
        
        // Actualizar dirección
        await address.update(addressData);
        
        res.json({
            msg: 'Dirección actualizada correctamente',
            address
        });
    } catch (error: any) {
        console.error('Error al actualizar dirección:', error);
        res.status(500).json({
            msg: 'Error al actualizar dirección',
            error: error.message
        });
    }
};

// Eliminar una dirección
export const deleteAddress = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.params.userId;
        
        // Verificar que la dirección exista y pertenezca al usuario
        const address = await DeliveryAddress.findOne({
            where: { 
                id,
                user_id: userId
            }
        });
        
        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }
        
        // Eliminar dirección
        await address.destroy();
        
        res.json({
            msg: 'Dirección eliminada correctamente'
        });
    } catch (error: any) {
        console.error('Error al eliminar dirección:', error);
        res.status(500).json({
            msg: 'Error al eliminar dirección',
            error: error.message
        });
    }
};

// Establecer una dirección como predeterminada
export const setDefaultAddress = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.params.userId;
        
        // Verificar que la dirección exista y pertenezca al usuario
        const address = await DeliveryAddress.findOne({
            where: { 
                id,
                user_id: userId
            }
        });
        
        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }
        
        // Establecer como predeterminada
        await address.update({ is_default: true });
        
        res.json({
            msg: 'Dirección establecida como predeterminada',
            address
        });
    } catch (error: any) {
        console.error('Error al establecer dirección predeterminada:', error);
        res.status(500).json({
            msg: 'Error al establecer dirección predeterminada',
            error: error.message
        });
    }
};