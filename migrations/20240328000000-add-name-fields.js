'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // await queryInterface.addColumn('Users', 'firstName', {
    //   type: Sequelize.STRING,
    //   allowNull: true
    // });

    // await queryInterface.addColumn('Users', 'lastName', {
    //   type: Sequelize.STRING,
    //   allowNull: true
    // });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'firstName');
    await queryInterface.removeColumn('Users', 'lastName');
  }
};