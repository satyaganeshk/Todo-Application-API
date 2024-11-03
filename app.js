const express = require('express')
const app = express()
app.use(express.json())
const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
const toDate = require('date-fns/toDate')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const path = require('path')
const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(e.message)
  }
}

initializeDBAndServer()

const checkRequestQueries = async (request, response, next) => {
  const {search_q, category, priority, status, date} = request.query
  const {todoId} = request.params
  if (category !== undefined) {
    const categoryArray = ['WORK', 'HOME', 'LEARNING']
    const isCategory = categoryArray.includes(category)
    if (isCategory === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return // Add return statement to stop further execution
    }
  }

  if (priority !== undefined) {
    const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    const isPriority = priorityArray.includes(priority)
    if (isPriority === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    const isStatus = statusArray.includes(status)
    if (isStatus === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (date !== undefined) {
    try {
      const myDate = new Date(date)

      // Check if the date is valid
      if (!isValid(myDate)) {
        response.status(400).send('Invalid Due Date')
        return
      }

      // Format the date using 'format' function
      const formatDate = format(myDate, 'yyyy-MM-dd')
      console.log(formatDate, 'Formatted Date')

      request.date = formatDate
    } catch (e) {
      console.error(e)
      response.status(400).send('Invalid Due Date')
      return
    }
  }
  request.todoId = todoId
  request.search_q = search_q
  next()
}

const checkRequestBody = async (request, response, next) => {
  const {id, todo, category, priority, status, date} = request.body
  const {todoId} = request.params
  if (category !== undefined) {
    const categoryArray = ['WORK', 'HOME', 'LEARNING']
    const isCategory = categoryArray.includes(category)
    if (isCategory === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return // Add return statement to stop further execution
    }
  }
  if (priority !== undefined) {
    const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    const isPriority = priorityArray.includes(priority)
    if (isPriority === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    const isStatus = statusArray.includes(status)
    if (isStatus === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (date !== undefined) {
    try {
      const myDate = new Date(date)

      // Check if the date is valid
      if (!isValid(myDate)) {
        response.status(400).send('Invalid Due Date')
        return
      }

      // Format the date using 'format' function
      const formatDate = format(myDate, 'yyyy-MM-dd')
      console.log(formatDate, 'Formatted Date')

      request.date = formatDate
    } catch (e) {
      console.error(e)
      response.status(400).send('Invalid Due Date')
      return
    }
  }
  request.todoId = todoId
  request.id = id
  request.date = date
  request.todo = todo
  next()
}

app.get('/todos/', checkRequestQueries, async (request, response) => {
  const {status = '', search_q = '', priority = '', category = ''} = request
  console.log(status, search_q, priority, category)
  const getTodosQuery = `
      SELECT
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
      FROM
          todo
      WHERE 
            todo LIKE '%${search_q}%' AND 
            (category LIKE "%${category}%" OR "${category}" = '') AND 
            (status LIKE '%${status}%' OR "${status}" = '') AND 
            (priority LIKE '%${priority}%' OR "${priority}" = '');`
  const todosArray = await db.all(getTodosQuery)
  response.send(todosArray)
})

app.get('/todos/:todoId/', checkRequestQueries, async (request, response) => {
  const {todoId} = request
  const getTodoQuery = `
      SELECT
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
      FROM
          todo
      WHERE 
          id = ${todoId};
        `
  const todoQuery = await db.get(getTodoQuery)
  response.send(todoQuery)
})

app.get('/agenda/', checkRequestQueries, async (request, response) => {
  const {date} = request
  console.log(date, 'a')
  const getTodosQuery = `
        SELECT 
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
        FROM
            todo
        WHERE
               due_date = '${date}';`
  const todoArray = await db.all(getTodosQuery)
  if (todoArray === undefined) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    response.send(todoArray)
  }
})
app.post('/todos/', checkRequestBody, async (request, response) => {
  const {id, todo, category, priority, status, date} = request.body
  const addTodoQuery = `
        INSERT INTO
            todo(id,todo,priority,status,category, due_date)
        VALUES
            (
              ${id},
              '${todo}',
              "${priority}",
              '${status}',
              '${category}',
              '${date}'
            );`
  await db.run(addTodoQuery)
  response.send('Todo Successfully Added')
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteQuery = `
      DELETE
      FROM
        todo
      WHERE 
        id = ${todoId};
  `
  await db.run(deleteQuery)
  response.send('Todo Deleted')
})

app.put('/todos/:todoId/', checkRequestBody, async (request, response) => {
  const {todoId} = request.params
  const {priority, todo, status, category, date} = request.body
  let updateQuery = null
  console.log(priority, todo, status, category, date)
  switch (true) {
    case status !== undefined:
      updateQuery = `
          UPDATE
              todo
          SET 
              status = "${status}"
          WHERE
              id = ${todoId};
      `
      await db.run(updateQuery)
      response.send('Status Updated')
      break
    case priority !== undefined:
      updateQuery = `
          UPDATE
              todo
          SET 
              priority = '${priority}'
          WHERE
              id = ${todoId};
      `
      await db.run(updateQuery)
      response.send('Priority Updated')
      break
    case todo !== undefined:
      updateQuery = `
          UPDATE
              todo
          SET
              todo = '${todo}'
          WHERE
              id = ${todoId};
      `
      await db.run(updateQuery)
      response.send('Todo Updated')
      break
    case category !== undefined:
      updateQuery = `
          UPDATE
              todo
          SET
              category = "${category}"
          WHERE
              id = ${todoId};
      `
      await db.run(updateQuery)
      response.send('Category Updated')
      break
    case date !== undefined:
      updateQuery = `
          UPDATE
              todo
          SET 
               due_date = '${date}'
          WHERE
              id = ${todoId};
      `
      await db.run(updateQuery)
      response.send('Due Date Updated')
      break
  }
})
module.exports = app
