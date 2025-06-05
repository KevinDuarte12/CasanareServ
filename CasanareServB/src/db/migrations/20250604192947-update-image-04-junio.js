'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    await queryInterface.addColumn('images', 'alt_text', {
      type: Sequelize.STRING(255),
      allowNull: true
    });


    await queryInterface.sequelize.query(`
      ALTER TABLE images 
      MODIFY COLUMN entity_type ENUM('user', 'product', 'category', 'barter', 'rating') NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {

    await queryInterface.removeColumn('images', 'alt_text');

    
    await queryInterface.sequelize.query(`
      DELETE FROM images WHERE entity_type = 'rating';
    `);
    
    // Luego restaurar el enum original
    await queryInterface.sequelize.query(`
      ALTER TABLE images 
      MODIFY COLUMN entity_type ENUM('user', 'product', 'category', 'barter') NOT NULL;
    `);
  }
};