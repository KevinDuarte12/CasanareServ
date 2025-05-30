'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Modificar el ENUM status para incluir 'pendiente'
    await queryInterface.sequelize.query(`
      ALTER TABLE products 
      MODIFY COLUMN status ENUM('disponible', 'vendido', 'en_trueque', 'inactivo', 'pendiente') 
      DEFAULT 'disponible';
    `);

    // 2. Añadir los nuevos campos
    await queryInterface.addColumn('products', 'admin_approved', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('products', 'has_pending_barters', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir los cambios
    await queryInterface.removeColumn('products', 'admin_approved');
    await queryInterface.removeColumn('products', 'has_pending_barters');
    
    await queryInterface.sequelize.query(`
      ALTER TABLE products 
      MODIFY COLUMN status ENUM('disponible', 'vendido', 'en_trueque', 'inactivo') 
      DEFAULT 'disponible';
    `);
  }
};