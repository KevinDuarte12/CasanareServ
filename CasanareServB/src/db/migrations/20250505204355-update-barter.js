'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Iniciando migración para resolver duplicados en barters...');
      
      // PASO 1: Identificar duplicados en la tabla
      const [duplicateGroups] = await queryInterface.sequelize.query(`
        SELECT id_prod_offer, COUNT(*) as count
        FROM barters
        GROUP BY id_prod_offer
        HAVING COUNT(*) > 1
      `);

      console.log(`Encontrados ${duplicateGroups.length} productos con múltiples barters.`);

      // PASO 2: Para cada grupo de duplicados, mantener solo el registro más reciente
      let deletedCount = 0;
      
      for (const group of duplicateGroups) {
        const prodOfferId = group.id_prod_offer;
        
        // Obtener todos los barters para este producto, ordenados por fecha (más reciente primero)
        const [duplicates] = await queryInterface.sequelize.query(`
          SELECT id_barter, id_prod_offer, request_date
          FROM barters
          WHERE id_prod_offer = ${prodOfferId}
          ORDER BY request_date DESC, id_barter DESC
        `);
        
        if (duplicates.length <= 1) continue;
        
        // Mantener el primero (más reciente)
        const keepId = duplicates[0].id_barter;
        
        // Eliminar todos los demás
        const deleteIds = duplicates.slice(1).map(d => d.id_barter);
        
        console.log(`Producto ${prodOfferId}: manteniendo barter ${keepId}, eliminando ${deleteIds.length} duplicados`);
        
        if (deleteIds.length > 0) {
          await queryInterface.sequelize.query(`
            DELETE FROM barters
            WHERE id_barter IN (${deleteIds.join(',')})
          `);
          
          deletedCount += deleteIds.length;
        }
      }
      
      console.log(`Se eliminaron ${deletedCount} registros duplicados.`);
      
      // PASO 3: Verificar si el índice único ya existe
      const [existingIndexes] = await queryInterface.sequelize.query(`
        SHOW INDEXES FROM barters 
        WHERE Column_name = 'id_prod_offer' AND Non_unique = 0
      `);
      
      // PASO 4: Añadir índice único si no existe
      if (existingIndexes.length === 0) {
        console.log('Añadiendo índice único para id_prod_offer...');
        
        await queryInterface.addConstraint('barters', {
          fields: ['id_prod_offer'],
          type: 'unique',
          name: 'unique_prod_offer'
        });
        
        console.log('✅ Índice único añadido exitosamente.');
      } else {
        console.log('⚠️ Ya existe un índice único para id_prod_offer, omitiendo este paso.');
      }
      
      // PASO 5: Actualizar la definición de la columna para incluir UNIQUE
      console.log('Actualizando definición de columna id_prod_offer...');
      
      // En MySQL, no podemos hacer ALTER COLUMN y ADD CONSTRAINT en la misma operación
      // Por lo que verificamos si ya se añadió la restricción
      
      if (existingIndexes.length === 0) {
        await queryInterface.changeColumn('barters', 'id_prod_offer', {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id_product'
          },
          onDelete: 'CASCADE',
          unique: true // Esto es redundante si ya añadimos el índice, pero es explícito
        });
      }
      
      console.log('✅ Migración completada exitosamente.');
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error durante la migración:', error);
      return Promise.reject(error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      console.log('Revirtiendo migración: Eliminando índice único de id_prod_offer...');
      
      // Verificar si el índice existe antes de intentar eliminarlo
      const [existingIndexes] = await queryInterface.sequelize.query(`
        SHOW INDEXES FROM barters 
        WHERE Column_name = 'id_prod_offer' AND Non_unique = 0
      `);
      
      if (existingIndexes.length > 0) {
        // Eliminar la restricción UNIQUE
        await queryInterface.removeConstraint('barters', 'unique_prod_offer');
        
        // Restaurar la definición original de la columna
        await queryInterface.changeColumn('barters', 'id_prod_offer', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'products',
            key: 'id_product'
          },
          onDelete: 'CASCADE'
        });
        
        console.log('✅ Índice único eliminado correctamente.');
      } else {
        console.log('⚠️ No se encontró índice único para eliminar.');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error durante la reversión:', error);
      return Promise.reject(error);
    }
  }
};