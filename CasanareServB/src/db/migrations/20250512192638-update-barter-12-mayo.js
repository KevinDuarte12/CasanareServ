'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Añadir un nuevo campo exchange_type
    await queryInterface.addColumn('barters', 'exchange_type', {
      type: Sequelize.ENUM('product_for_product', 'product_with_money', 'money_only'),
      defaultValue: 'product_for_product',
      allowNull: false
    });

    // Añadir un índice para búsquedas rápidas por tipo de intercambio
    await queryInterface.addIndex('barters', ['exchange_type']);
    
    // ----- NUEVA MODIFICACIÓN: Actualizar el campo status para incluir 'disponible' -----
    
    // Para MySQL, modificamos el campo status directamente
    await queryInterface.sequelize.query(`
      ALTER TABLE barters 
      MODIFY COLUMN status ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin') 
      DEFAULT 'pendiente'
    `);
    
    // Actualizar los trueques existentes que tienen status NULL o vacío a 'disponible'
    await queryInterface.sequelize.query(`
      UPDATE barters 
      SET status = 'disponible' 
      WHERE status IS NULL OR status = ''
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar la columna exchange_type
    await queryInterface.removeColumn('barters', 'exchange_type');
    
    // Eliminar el tipo ENUM de exchange_type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_barters_exchange_type;');
    
    // ----- NUEVA MODIFICACIÓN: Revertir la modificación del campo status -----
    
    // Volver al estado original del campo status (sin 'disponible')
    await queryInterface.sequelize.query(`
      ALTER TABLE barters 
      MODIFY COLUMN status ENUM('pendiente', 'aceptado', 'rechazado', 'completado', 'aprobado_admin') 
      DEFAULT 'pendiente'
    `);
  }
};
