/*
    1) First step is to establish the express application
        require means include (we are drawing it from somewhere else)
        https://expressjs.com/en/4x/api.html#res.send
        http://localhost:3000
        https://youtu.be/sB3acNJeNKE
  
    2) 
        https://stackoverflow.com/questions/12703098/how-to-get-a-json-file-in-express-js-and-display-in-view
        https://expressjs.com/en/guide/using-middleware.html
        PUG:  https://teamtreehouse.com/library/middleware-in-context

        definition:  next:  https://stackoverflow.com/questions/10695629/what-is-the-parameter-next-used-for-in-express

            http://expressjs.com/en/starter/static-files.html  

*/
// Step 1 create an express app
const express = require('express');
const app = express();

//specify Pug as the view engine for the app
const path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//This is middleware to access the public folder via route /static
app.use('/static', express.static(path.join(__dirname, 'public')))
app.get('/favicon.ico', (req, res) => res.redirect('/static/favicon.ico'));

//https://express-validator.github.io/docs/
//https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/forms
//https://stackoverflow.com/questions/50767728/no-errors-with-express-validator-isempty
//https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/forms/Create_genre_form

//YM 8-24-2019 remove express-validator from use; rely on Sequelizer input validator instead.
//const { check, validationResult } = require('express-validator');

//https://www.tutorialspoint.com/expressjs/expressjs_form_data.htm
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

//Extra Credit:  Pagination - each page has 10 items (Books)
const itemsPerPage = 10;

//const db = require('./models'); //typical way to get Sequelize DB object
//using app.set instead as per:
//https://www.redotheweb.com/2013/02/20/sequelize-the-javascript-orm-in-practice.html
app.set('models', require('./models'));

//Import Sequelize module to use Sequelize.Op in search action and lets us chain together logical statements
const Sequelize = require('sequelize');

// 1st Route:  Define route for main page at /  (GET - retrieve information)
//Define Home Page: redirect to '/books'
//If there is a runtime error go to the error page
app.get('/', (req, res, next) => {
  try
  {
      res.redirect('/books');
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

// 2nd Route:  Define route for 'list' which list all the books for this page
//             Action for books - index.pug view
app.get('/books', (req, res, next) => {
  try
  {
  //for testing purposes - go to error page on load
  //next(new Error('Request could not be fulfilled'));

     //Extra Credit: http://localhost:3000/books/?page=2
     //https://coursework.vschool.io/express-params-and-query/
     //Query string passes parameters to the application request 
     //Accessible using req.query
     let page = parseInt(req.query.page);
      if (!page) {  //if page is not defined == null
        page = 1;   //set it to page 1 if no page is in the query string

    }   
      //Calculates offset based on the page number 
      //https://www.rubydoc.info/github/jeremyevans/sequel/Sequel%2FDataset:limit
      const offset = (page-1) * itemsPerPage;
      //This is the model of the book
      const Book = app.get('models').Book;

      //https://sequelize.org/master/manual/querying.html
      const getBooksOffset = Book.findAll({
          order: [
              ['author', 'ASC'],
              ['title', 'ASC'],
          ],
          limit: itemsPerPage, 
          offset: offset
      });
      //SELECT * FROM Books ORDER BY author ASC, title ASC OFFSET [offset] LIMIT [itemsPerPage]

      //SELECT COUNT(*) FROM Books
      const getTotalBooks = Book.count();

      //https://stackoverflow.com/questions/48376479/executing-multiple-sequelize-js-model-query-methods-with-promises-node
      //the eventual value or result of a asynchronous operation
      Promise
      .all([getBooksOffset, getTotalBooks])
      .then((responses) => {
          const queryOffsetList = responses[0];
          const pageCount = Math.ceil(responses[1] / itemsPerPage);
          res.render("index", {
              bookList: queryOffsetList,
              page: page,
              pageCount: pageCount
          });
      })
      //YM 8-24-2019 Give promise section its own catch() to handle errors generated within
      .catch((err) => {
        res.send(500)
      });
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

// 3rd Route:  Define route for 'new' 
//             GET action for books - new-book.pug view
app.get('/books/new', (req, res, next) => {
  try
  {
     res.render("new-book");
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

// 4th Route:  Define route for 'new' 
//             POST action for books - ? view
//https://lorenstewart.me/2016/10/03/sequelize-crud-101/
//https://stackoverflow.com/questions/9304888/how-to-get-data-passed-from-a-form-in-express-node-js
//

//YM 8-24-2019: disable page validators, use Sequelize validators instead
/*
app.post('/books/new', [
  check('title', 'Name is required').not().isEmpty(),
  check('author', 'Author is required').not().isEmpty()
], (req, res, next) => {
  */
app.post('/books/new', (req, res, next) => {
try
{
  //YM 8-24-2019 disable page validators, use Sequelize validators instead
  //const errors = validationResult(req);
  
  /*
  if (!errors.isEmpty())
  {
      return res.render('new-book', { errors: errors.array(), title: req.body.title,
          author: req.body.author, genre: req.body.genre, year: req.body.year })
  }
  else
  {
    */
  const Book = app.get('models').Book;
  Book.create({
      title: req.body.title,
      author: req.body.author,
      genre: req.body.genre,
      year: req.body.year
  })
  .then(() => {
      res.redirect('/books');
  })
  //YM 8-24-2019 Give promise section its own catch() to handle errors generated within
  //YM 8-24-2019 If Sequelize error, render the new-book page again, else fall into next .catch(err) - throw err;
  .catch((err) => {
    if (err.name === "SequelizeValidationError") {
      res.render("new-book", {
        book: Book.build(req.body),
        errors: err.errors
      });
    }
    else
    {
      throw err;
    }
  })
  .catch((err) => {
    res.send(500)
  });
  //}
}
catch (e) {
  next(new Error('Request could not be fulfilled'));
}
});

// 5th Route:  Define route for 'show' 
//             url parameter book for ID :id - update-book.pug view
//primary key https://sequelize.org/master/class/lib/model.js~Model.html#static-method-findByPk
app.get('/books/:id', (req, res, next) => {
  try
  {
      const Book = app.get('models').Book;
      Book.findByPk(req.params.id).then((foundBook) => {
          if (foundBook)
          {
            res.render("update-book", { id: foundBook.id, book: foundBook });
          }
          else
          {
            //YM 8-24-2019 render our 404 if the book at :id is not in the database
            res.render('page-not-found');
          }
      })
      //YM 8-24-2019 Give promise section its own catch() to handle errors generated within
      .catch((err) => {
        res.send(500)
      });
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

// 6th Route:  Define route for 'update' (POST - send information)
//             book for ID :id - ? view

//YM 8-24-2019 use Sequelize validators instead of express-validator
/*
app.post('/books/:id',  [
  check('title', 'Name is required').not().isEmpty(),
  check('author', 'Author is required').not().isEmpty()
], (req, res, next) => {
  */
app.post('/books/:id', (req, res, next) => {
  try
  {
    /*
      const errors = validationResult(req);

      if (!errors.isEmpty())
      {
          return res.render('update-book', { errors: errors.array(), title: req.body.title,
              author: req.body.author, genre: req.body.genre, year: req.body.year, id: req.params.id })
      }
      else
      {
        */
    const Book = app.get('models').Book;

    Book.update({
        title: req.body.title,
        author: req.body.author,
        genre: req.body.genre,
        year: req.body.year
        },
        {where: {id: req.params.id}
        }
    )
    .then(() => {
        res.redirect('/books');
    })
    //YM 8-24-2019 Give promise section its own catch() to handle errors generated within
    //YM 8-24-2019 If Sequelize error, render the update-book page again, else fall into next .catch(err) - throw err;
    .catch((err) => {
      if (err.name === "SequelizeValidationError") {
        res.render("update-book", {
          id: req.params.id,
          book: Book.build(req.body),
          errors: err.errors
        });
      }
      else
      {
        throw err;
      }
    })
    .catch((err) => {
      res.send(500)
    });
  //    }
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

// 7th Route:  Define route for 'delete' 
//             book for ID :id - ? view
app.post('/books/:id/delete', (req, res, next) => {
  try
  {
      const Book = app.get('models').Book;

      Book.findByPk(req.params.id).then((foundBook) => {
        if (foundBook)
        {
          Book.destroy({
            where: {id: req.params.id}
          }).then(() => {
            res.redirect('/books');
          })
          //YM 8-24-2019 Give promise section its own catch() to handle errors generated within
          .catch((err) => {
            res.send(500)
          });
        }
        else
        {
          //YM 8-24-2019 Render our 404 if the book with this :id was not found
          res.render('page-not-found');
        }
      })
      //YM 8-24-2019 Give promise section its own catch() to handle errors generated within
      .catch((err) => {
        res.send(500)
      });
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

app.get('/search', (req, res, next) => {
  try
  {
     res.render("search-book");
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

app.post('/search', (req, res, next) => {
try
{
      const Op = Sequelize.Op;
      const Book = app.get('models').Book;
      Book.findAll({
        where: {
          [Op.and]: {
            title: {
              //YM 8-24-2019 Op.like already case-insensitive
              [Op.like]: '%' + req.body.title + '%'
            },
            author: {
              [Op.like]: '%' + req.body.author + '%'
            },
            genre: {
              [Op.like]: '%' + req.body.genre + '%'
            },
            year: {
              [Op.like]: '%' + req.body.year + '%'
            }
          }
        },
        order: [
              ['author', 'ASC'],
              ['title', 'ASC'],
          ]
      })
      .then((queryReturn) => {
          res.render("search-results", {
              bookList: queryReturn,
          });
      })
      //YM 8-24-2019 Give promise section its own catch() to handle errors generated within
      .catch((err) => {
        res.send(500)
      });
  
}
catch (e) {
  next(new Error('Request could not be fulfilled'));
}
});

//default route - respond to anything besides those above
app.use((req, res, next) => {
  console.log("Requested route is undefined.");
  res.render("page-not-found");
});

const newLocal = 500;
//error route: reached from any of the non-default in the
//event of an error (error handler)
app.use((err, req, res, next) => {
    console.log(err);    
    if(!res.headersSent){
      res.status(newLocal);
      res.render('error', {error: err});
    }
  });

//specify port 3000 as the application location at localhost
const portNumber = 3000;
//initiate the app on port 3000
app.listen(portNumber);
//log that the application is ready for requests
console.log("App started on localhost at port " + portNumber);
