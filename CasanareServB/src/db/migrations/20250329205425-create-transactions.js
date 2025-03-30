'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {
      id_transaction: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_cart: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'carts', key: 'id_cart' }
      },
      id_user: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pendiente', 'completada', 'fallida', 'reembolsada'),
        defaultValue: 'pendiente'
      },
      reference_payu: {
        type: Sequelize.STRING(255)
      },
      payment_method: {
        type: Sequelize.STRING(50)
      },
      transaction_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('transactions');
  }
};