'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Añadir campos para el proceso de checkout
    await queryInterface.addColumn('barters', 'offer_pickup_address_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'delivery_addresses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('barters', 'offer_delivery_address_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'delivery_addresses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('barters', 'request_pickup_address_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'delivery_addresses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('barters', 'request_delivery_address_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'delivery_addresses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('barters', 'offer_checkout_completed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    await queryInterface.addColumn('barters', 'request_checkout_completed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    await queryInterface.addColumn('barters', 'checkout_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    // Añadir el estado 'en_proceso' a la enumeración de status
    try {
      // Verificar la versión de Postgres - esta sintaxis funciona en postgres pero podría variar según el dialecto
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_barters_status" ADD VALUE IF NOT EXISTS 'en_proceso';
      `).catch(async () => {
        // Para MySQL y otros que no soportan la sintaxis anterior
        await queryInterface.changeColumn('barters', 'status', {
          type: Sequelize.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin', 'en_proceso'),
          defaultValue: 'pendiente'
        });
      });
    } catch (error) {
      console.error('Error modificando enum de status, intentando método alternativo:', error);
      
      // Método alternativo para MySQL o SQLite
      // Primero crear una columna temporal
      await queryInterface.addColumn('barters', 'status_new', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pendiente'
      });
      
      // Copiar datos
      await queryInterface.sequelize.query(`
        UPDATE barters SET status_new = status;
      `);
      
      // Eliminar columna original
      await queryInterface.removeColumn('barters', 'status');
      
      // Crear nueva columna con el tipo ENUM actualizado
      await queryInterface.addColumn('barters', 'status', {
        type: Sequelize.ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin', 'en_proceso'),
        allowNull: false,
        defaultValue: 'pendiente'
      });
      
      // Copiar datos de vuelta
      await queryInterface.sequelize.query(`
        UPDATE barters SET status = status_new;
      `);
      
      // Eliminar columna temporal
      await queryInterface.removeColumn('barters', 'status_new');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar las columnas añadidas
    await queryInterface.removeColumn('barters', 'offer_pickup_address_id');
    await queryInterface.removeColumn('barters', 'offer_delivery_address_id');
    await queryInterface.removeColumn('barters', 'request_pickup_address_id');
    await queryInterface.removeColumn('barters', 'request_delivery_address_id');
    await queryInterface.removeColumn('barters', 'offer_checkout_completed');
    await queryInterface.removeColumn('barters', 'request_checkout_completed');
    await queryInterface.removeColumn('barters', 'checkout_date');
    
    // No podemos eliminar valores de enums en la mayoría de sistemas, así que dejamos 'en_proceso'
  }
};