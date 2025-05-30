'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Añadir nuevos campos para WebCheckout PayU
    await queryInterface.addColumn('transactions', 'currency', {
      type: Sequelize.STRING(3),
      allowNull: true,
      defaultValue: 'COP'
    });

    await queryInterface.addColumn('transactions', 'payu_transaction_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('transactions', 'payu_order_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('transactions', 'payu_state', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('transactions', 'payu_response_code', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('transactions', 'payu_response_message', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('transactions', 'delivery_address_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'delivery_addresses', // Asegurate que esta tabla exista
        key: 'id'
      }
    });

    await queryInterface.addColumn('transactions', 'buyer_email', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('transactions', 'buyer_name', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('transactions', 'buyer_phone', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    
    await queryInterface.addColumn('transactions', 'confirmation_received', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    
    // Adicional para PayU Latam específicamente
    await queryInterface.addColumn('transactions', 'response_url', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('transactions', 'signature', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    // === AGREGADO PARA TRUEQUE ===
    await queryInterface.addColumn('transactions', 'id_barter', {
      type: Sequelize.INTEGER,
      allowNull: true,
      // references: { model: 'barters', key: 'id_barter' } // Descomenta si tienes tabla de trueques
    });

    // Permitir null en id_cart para soportar transacciones de trueque
    await queryInterface.changeColumn('transactions', 'id_cart', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir cambios
    await queryInterface.removeColumn('transactions', 'currency');
    await queryInterface.removeColumn('transactions', 'payu_transaction_id');
    await queryInterface.removeColumn('transactions', 'payu_order_id');
    await queryInterface.removeColumn('transactions', 'payu_state');
    await queryInterface.removeColumn('transactions', 'payu_response_code');
    await queryInterface.removeColumn('transactions', 'payu_response_message');
    await queryInterface.removeColumn('transactions', 'delivery_address_id');
    await queryInterface.removeColumn('transactions', 'buyer_email');
    await queryInterface.removeColumn('transactions', 'buyer_name');
    await queryInterface.removeColumn('transactions', 'buyer_phone');
    await queryInterface.removeColumn('transactions', 'confirmation_received');
    await queryInterface.removeColumn('transactions', 'response_url');
    await queryInterface.removeColumn('transactions', 'signature');
    await queryInterface.removeColumn('transactions', 'id_barter');
    // Opcional: volver a poner allowNull: false en id_cart si lo cambiaste
    await queryInterface.changeColumn('transactions', 'id_cart', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};