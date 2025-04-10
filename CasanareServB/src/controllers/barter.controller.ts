import { Request, Response } from 'express';
import Barter from '../db/models/barter';
import Product from '../db/models/product';
import User from '../db/models/user';

// Obtener todos los trueques
export const getBarters = async (req: Request, res: Response) => {
    try {
        const barters = await Barter.findAll({
            include: [
                {
                    model: Product,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: Product,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: User,
                    as: 'offering_user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'receiving_user',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['request_date', 'DESC']]
        });

        res.json(barters);
    } catch (error) {
        console.error('Error al obtener trueques:', error);
        res.status(500).json({
            msg: 'Error al obtener los trueques'
        });
    }
};

// Obtener un trueque por ID
export const getBarterById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const barter = await Barter.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: Product,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: User,
                    as: 'offering_user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'receiving_user',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }

        res.json(barter);
    } catch (error) {
        console.error('Error al obtener trueque:', error);
        res.status(500).json({
            msg: 'Error al obtener el trueque'
        });
    }
};

// Crear un nuevo trueque
export const createBarter = async (req: Request, res: Response) => {
    const { id_prod_offer, id_prod_request, id_user_offer, id_user_receiving, value } = req.body;

    try {
        // Verificar si los productos existen
        const prodOfferExists = await Product.findByPk(id_prod_offer);
        if (!prodOfferExists) {
            return res.status(400).json({
                msg: `No existe un producto ofrecido con el ID ${id_prod_offer}`
            });
        }

        const prodRequestExists = await Product.findByPk(id_prod_request);
        if (!prodRequestExists) {
            return res.status(400).json({
                msg: `No existe un producto solicitado con el ID ${id_prod_request}`
            });
        }

        // Verificar si los usuarios existen
        const userOfferExists = await User.findByPk(id_user_offer);
        if (!userOfferExists) {
            return res.status(400).json({
                msg: `No existe un usuario oferente con el ID ${id_user_offer}`
            });
        }

        const userReceivingExists = await User.findByPk(id_user_receiving);
        if (!userReceivingExists) {
            return res.status(400).json({
                msg: `No existe un usuario receptor con el ID ${id_user_receiving}`
            });
        }

        // Crear el trueque
        const barter = await Barter.create({
            id_prod_offer,
            id_prod_request,
            id_user_offer,
            id_user_receiving,
            value,
            status: 'pendiente',
            request_date: new Date()
        });

        // Cambiar estado de los productos a "en_trueque"
        await Product.update(
            { status: 'en_trueque' },
            { where: { id_product: id_prod_offer } }
        );

        await Product.update(
            { status: 'en_trueque' },
            { where: { id_product: id_prod_request } }
        );

        res.status(201).json({
            msg: 'Solicitud de trueque creada correctamente',
            barter
        });
    } catch (error) {
        console.error('Error al crear trueque:', error);
        res.status(500).json({
            msg: 'Error al crear el trueque'
        });
    }
};

// Actualizar el estado de un trueque
export const updateBarterStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    console.log("Status recibido:", status); // Añadir para debugging
    console.log("Body completo:", req.body);
  
    // Si status es undefined, es posible que el frontend esté enviando un objeto distinto
    // Intenta buscar el status de otra forma como alternativa
    const statusToUse = status || req.body.estado || 'pendiente';

    // Validar que el nuevo estado sea válido
    const validStatus = ['pendiente', 'aceptado', 'rechazado', 'completado'];
    if (!statusToUse || !validStatus.includes(statusToUse)) {
        return res.status(400).json({
            msg: `El estado ${statusToUse} no es válido. Valores permitidos: ${validStatus.join(', ')}`
        });
    }

    try {
        // Verificar si existe el trueque
        const barter = await Barter.findByPk(id);
        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }

        // Actualizar el estado y fecha de resolución si es aceptado, rechazado o completado
        if (statusToUse !== 'pendiente') {
            await barter.update({
                status: statusToUse,
                resolution_date: new Date()
            });

            // Actualizar el estado de los productos según el nuevo estado del trueque
            const id_prod_offer = barter.getDataValue('id_prod_offer');
            const id_prod_request = barter.getDataValue('id_prod_request');

            if (statusToUse === 'completado') {
                // Si se completa el trueque, los productos pasan a estado "vendido"
                await Product.update(
                    { status: 'vendido' },
                    { where: { id_product: [id_prod_offer, id_prod_request] } }
                );
            } else if (statusToUse === 'rechazado') {
                // Si se rechaza, los productos vuelven a estar disponibles
                await Product.update(
                    { status: 'disponible' },
                    { where: { id_product: [id_prod_offer, id_prod_request] } }
                );
            }
        } else {
            // Si vuelve a pendiente, actualizar solo el estado
            await barter.update({ status: statusToUse });
        }

        res.json({
            msg: `Estado del trueque actualizado a ${statusToUse}`,
            barter
        });
    } catch (error) {
        console.error('Error al actualizar estado del trueque:', error);
        res.status(500).json({
            msg: 'Error al actualizar el estado del trueque'
        });
    }
};

// Eliminar un trueque (cancelar)
export const deleteBarter = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Verificar si existe el trueque
        const barter = await Barter.findByPk(id);
        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }

        // Solo permitir eliminar trueques pendientes
        if (barter.getDataValue('status') !== 'pendiente') {
            return res.status(400).json({
                msg: 'Solo se pueden eliminar trueques en estado pendiente'
            });
        }

        // Restaurar el estado de los productos a "disponible"
        const id_prod_offer = barter.getDataValue('id_prod_offer');
        const id_prod_request = barter.getDataValue('id_prod_request');

        await Product.update(
            { status: 'disponible' },
            { where: { id_product: [id_prod_offer, id_prod_request] } }
        );

        // Eliminar el trueque
        await barter.destroy();

        res.json({
            msg: 'Trueque eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar trueque:', error);
        res.status(500).json({
            msg: 'Error al eliminar el trueque'
        });
    }
};