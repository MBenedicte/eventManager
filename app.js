const express = require('express');
const body_parser = require('body-parser');
const graphQlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/events');
const User = require('./models/user');

const app = express();
const events = [];
app.use(body_parser.json());
app.use(
  '/graphQl',
  graphQlHttp({
    schema: buildSchema(`
    type Event {
      _id: ID!
      description: String!
      title: String!
      price: Float!
    }

    type User{
      _id:ID!
      email: String!
      password:String
    }

    type RootQuery {
      events: [Event!]!
    }

    input InputEvent {
      _id: ID!
      description: String!
      title: String!
      price: Float!
    }

    input InputUser{
      email: String!
      password:String!
    }

    type RootMutation {
      createEvent(inputEvent: InputEvent): Event
      createUser(inputUser: InputUser): User
    }

    schema {
      query: RootQuery,
      mutation: RootMutation
    }

    `),
    rootValue: {
      events: () => {
        return events;
      },
      createEvent: arg => {
        const event = new Event({
          description: arg.inputEvent.description,
          title: arg.inputEvent.title,
          price: +arg.inputEvent.price
        });

        return event
          .save()
          .then(result => {
            return { ...result._doc };
          })
          .catch(error => {
            throw error;
          });
      },
      createUser: arg => {
        User.findOne({ email: arg.inputUser.email })
          .then(user => {
            if (user) {
              throw new Error('user already exists');
            }
            return bcrypt.hash(arg.inputUser.password, 12);
          })
          .then(hashedPassword => {
            const user = new User({
              email: arg.inputUser.email,
              password: hashedPassword
            });
            return user.save();
          })
          .then(result => {
            return { ...result._doc, _id: result.id };
          })
          .catch(err => {
            throw err;
          });
      }
    },
    graphiql: true
  })
);

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-jkwgv.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;
mongoose
  .connect(uri)
  .then(() => {
    app.listen(3000, () => console.log('App listening to 3000'));
  })
  .catch(err => {
    throw err;
  });
