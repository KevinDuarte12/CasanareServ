'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chat_messages', {
      id_message: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      id_barter: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'barters', key: 'id_barter' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      id_product: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'products', key: 'id_product' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      id_user: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('chat_messages');
  }
};