'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      // Añadir columna is_finalized
      queryInterface.addColumn('chat_messages', 'is_finalized', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }),
      
      // Añadir columna deleted_for_user (como array JSON)
      queryInterface.addColumn('chat_messages', 'deleted_for_user', {
        type: Sequelize.JSON,
        defaultValue: []
      })
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('chat_messages', 'is_finalized'),
      queryInterface.removeColumn('chat_messages', 'deleted_for_user')
    ]);
  }
};
