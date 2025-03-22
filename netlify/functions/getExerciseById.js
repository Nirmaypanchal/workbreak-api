const path = require('path');
const fs = require('fs');

// Function to read exercises from the JSON file
const getExercises = () => {
  try {
    const exercisesPath = path.join(__dirname, '..', '..', 'data', 'exercises.json');
    const exercisesData = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));
    return exercisesData.exercises;
  } catch (error) {
    console.error('Error reading exercises:', error);
    return [];
  }
};

exports.handler = async (event, context) => {
  try {
    const exerciseId = event.queryStringParameters?.id;
    
    if (!exerciseId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Exercise ID is required" })
      };
    }
    
    const exercises = getExercises();
    const exercise = exercises.find(ex => ex.id === exerciseId);
    
    if (!exercise) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Exercise not found" })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(exercise)
    };
  } catch (error) {
    console.error("Error in getExerciseById function:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Failed to get exercise" })
    };
  }
};