import { Request, Response } from 'express';
import Product from '../db/models/product';
import User from '../db/models/user';
import Category from '../db/models/category';

interface CreateProductBody {
    id_user: number;
    id_category: number;
    name: string;
    stock: number
    description?: string;
    price: number;
    status?: 'disponible' | 'vendido' | 'en_trueque';
    permite_trueque?: boolean;
}

// GET - Obtener todos los productos
export const getProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const productos = await Product.findAll({
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: Category, as: 'category', attributes: ['id_category', 'name'] }
            ]
        });
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ msg: 'Error al obtener productos', error });
    }
};

// GET - Obtener un producto por ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const producto = await Product.findOne({
            where: { id_product: id },
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: Category, as: 'category', attributes: ['id_category', 'name'] }
            ]
        });

        if (!producto) {
            res.status(404).json({ msg: `No existe producto con id ${id}` });
            return;
        }

        res.json(producto);
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ msg: 'Error al obtener el producto', error });
    }
};

// POST - Crear nuevo producto
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    const body: CreateProductBody = req.body;
    try {
        const producto = await Product.create({
            ...body,
            status: 'disponible',
            permite_trueque: body.permite_trueque || false
        });

        const productoCreado = await Product.findOne({
            where: { id_product: producto.getDataValue('id_product') },
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: Category, as: 'category', attributes: ['id_category', 'name'] }
            ]
        });

        res.status(201).json({
            msg: 'Producto creado exitosamente',
            producto: productoCreado
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ msg: 'Error al crear producto', error });
    }
};

// PUT - Actualizar producto
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates: Partial<CreateProductBody> = req.body;
    try {
        const producto = await Product.findByPk(id);
        if (!producto) {
            res.status(404).json({ msg: `No existe producto con id ${id}` });
            return;
        }

        await producto.update(updates);

        const productoActualizado = await Product.findOne({
            where: { id_product: id },
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: Category, as: 'category', attributes: ['id_category', 'name'] }
            ]
        });

        res.json({
            msg: 'Producto actualizado exitosamente',
            producto: productoActualizado
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ msg: 'Error al actualizar producto', error });
    }
};

// DELETE - Eliminar producto
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const producto = await Product.findByPk(id);
        if (!producto) {
            res.status(404).json({ msg: `No existe producto con id ${id}` });
            return;
        }

        await producto.destroy();
        res.json({ 
            msg: 'Producto eliminado exitosamente',
            id: id
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ msg: 'Error al eliminar producto', error });
    }
};