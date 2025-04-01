'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('itemscart', {
      id_item: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_cart: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'carts', key: 'id_cart' }
      },
      id_product: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id_product' }
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('itemscart');
  }
};