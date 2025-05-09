// Nombre del archivo: YYYYMMDDHHMMSS-create-delivery-addresses.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('delivery_addresses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Usuario al que pertenece la dirección'
      },
      address_name: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Nombre identificativo de la dirección (ej: "Casa", "Oficina")'
      },
      recipient_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nombre de la persona que recibe el envío'
      },
      recipient_phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Teléfono de contacto para entregas'
      },
      address_line1: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Dirección principal (calle, carrera, etc.)'
      },
      address_line2: {
        type: Sequelize.STRING(150),
        allowNull: true,
        comment: 'Información adicional (apto, interior, etc.)'
      },
      neighborhood: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Barrio'
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Ciudad/Municipio'
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Departamento'
      },
      postal_code: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Código postal'
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es la dirección predeterminada'
      },
      additional_instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Instrucciones adicionales para el envío'
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

    // Crear índices
    await queryInterface.addIndex('delivery_addresses', ['user_id'], {
      name: 'idx_delivery_addresses_user'
    });
    
    await queryInterface.addIndex('delivery_addresses', ['user_id', 'is_default'], {
      name: 'idx_delivery_addresses_default'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('delivery_addresses');
  }
};