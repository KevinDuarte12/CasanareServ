// Nombre del archivo: YYYYMMDDHHMMSS-update-users-add-personal-info.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Añadir columnas para información personal al usuario
    await queryInterface.addColumn('users', 'document_type', {
      type: Sequelize.ENUM('CC', 'CE', 'TI', 'PP', 'NIT', 'Otro'),
      allowNull: true,
      comment: 'Tipo de documento de identidad'
    });

    await queryInterface.addColumn('users', 'document_number', {
      type: Sequelize.STRING(30),
      allowNull: true,
      comment: 'Número de documento de identidad'
    });

    await queryInterface.addColumn('users', 'department', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Departamento de residencia'
    });

    await queryInterface.addColumn('users', 'city', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Municipio/Ciudad de residencia'
    });

    await queryInterface.addColumn('users', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Número telefónico de contacto'
    });

    // Crear índice para búsquedas por documento
    await queryInterface.addIndex('users', ['document_type', 'document_number'], {
      name: 'idx_users_document',
      unique: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar columnas en caso de rollback
    await queryInterface.removeIndex('users', 'idx_users_document');
    await queryInterface.removeColumn('users', 'phone');
    await queryInterface.removeColumn('users', 'city');
    await queryInterface.removeColumn('users', 'department');
    await queryInterface.removeColumn('users', 'document_number');
    await queryInterface.removeColumn('users', 'document_type');
  }
};