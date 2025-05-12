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
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar la columna
    await queryInterface.removeColumn('barters', 'exchange_type');
    
    // Eliminar el tipo ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_barters_exchange_type;');
  }
};
