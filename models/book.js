'use strict';
module.exports = (sequelize, DataTypes) => {
  const Book = sequelize.define('Book', {
    title: {
      type: DataTypes.STRING,
      //YM 8-24-2019 correct validate property set: notEmpty is validate, custom error message shown on the respective form
      validate: { 
        notEmpty: {
          msg: "Title cannot be empty."
        }
      },
    },
    author: {
      type: DataTypes.STRING,
      //YM 8-24-2019 correct validate property set: notEmpty is validate, custom error message shown on the respective form
      validate: {
        notEmpty: {
          msg: "Author cannot be empty."
        }
      },
    },
    genre: DataTypes.STRING,
    year: DataTypes.INTEGER
  }, {});
  Book.associate = function(models) {
    // associations can be defined here
  };
  return Book;
};