'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('raitings', {
      id_raiting: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_product: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { 
          model: 'products', // debe coincidir exactamente con el nombre de la tabla
          key: 'id_product'
        }
      },
      id_barter: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { 
          model: 'barters', // debe coincidir exactamente con el nombre de la tabla
          key: 'id_barter'
        }
      },
      id_user_rated: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { 
          model: 'users', // debe coincidir exactamente con el nombre de la tabla
          key: 'id'
        }
      },
      id_user_qualifying: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { 
          model: 'users',
          key: 'id'
        }
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('raitings');
  }
};