'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove 'en_trueque' from status enum
    await queryInterface.changeColumn('products', 'status', {
      type: Sequelize.ENUM('disponible', 'vendido', 'inactivo'),
      defaultValue: 'disponible'
    });

    // Add new type column
    await queryInterface.addColumn('products', 'type', {
      type: Sequelize.ENUM('regular', 'barter'),
      defaultValue: 'regular',
      allowNull: false
    });

    // Remove permite_trueque column since it's no longer needed
    await queryInterface.removeColumn('products', 'permite_trueque');
  },

  down: async (queryInterface, Sequelize) => {
    // Restore permite_trueque column
    await queryInterface.addColumn('products', 'permite_trueque', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    // Remove type column
    await queryInterface.removeColumn('products', 'type');

    // Restore original status enum
    await queryInterface.changeColumn('products', 'status', {
      type: Sequelize.ENUM('disponible', 'vendido', 'en_trueque'),
      defaultValue: 'disponible'
    });
  }
};