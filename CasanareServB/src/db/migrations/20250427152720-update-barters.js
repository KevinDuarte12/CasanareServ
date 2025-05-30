'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add notes column
    await queryInterface.addColumn('barters', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Update status enum to include more detailed states
    await queryInterface.changeColumn('barters', 'status', {
      type: Sequelize.ENUM(
        'pendiente',
        'aceptado',
        'rechazado',
        'completado',
        'cancelado',
        'aprobado_admin'
      ),
      defaultValue: 'pendiente'
    });
  },

  down: async (queryInterface) => {
    // Remove notes column
    await queryInterface.removeColumn('barters', 'notes');

    // Restore original status enum
    await queryInterface.changeColumn('barters', 'status', {
      type: Sequelize.ENUM('pendiente', 'aceptado', 'rechazado', 'completado'),
      defaultValue: 'pendiente'
    });
  }
};