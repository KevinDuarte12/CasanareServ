'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('images', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      public_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      entity_type: {
        type: Sequelize.ENUM('user', 'product', 'category', 'barter'),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      is_main: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Añadir índices para búsquedas eficientes
    await queryInterface.addIndex('images', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('images', ['is_main']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('images');
  }
};