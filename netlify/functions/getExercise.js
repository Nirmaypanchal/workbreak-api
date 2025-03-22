const path = require('path');
const fs = require('fs');

// Time constants
const EXERCISE_INTERVAL_MINUTES = 45;
const MILLISECONDS_PER_MINUTE = 60 * 1000;

// Function to read exercises from the JSON file
const getExercises = () => {
  try {
    // In Netlify Functions, we can use the built-in filesystem access for JSON files
    // that are part of our deployment
    const exercisesPath = path.join(__dirname, '..', '..', 'data', 'exercises.json');
    const exercisesData = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));
    return exercisesData.exercises;
  } catch (error) {
    console.error('Error reading exercises:', error);
    // Return a few basic exercises as fallback
    return [
      {
        id: "push-ups-standard",
        name: "Standard Push-Ups",
        description: "Place hands shoulder-width apart and lower your body until your chest nearly touches the floor.",
        instructions: [
          "Start in a high plank position",
          "Lower your body until your chest nearly touches the floor",
          "Push back up to the starting position",
          "Repeat for 45-60 seconds"
        ],
        muscleGroups: ["chest", "triceps", "shoulders", "core"],
        equipment: []
      },
      {
        id: "squats-bodyweight",
        name: "Bodyweight Squats",
        description: "Lower your body by bending your knees as if sitting in a chair, then return to standing.",
        instructions: [
          "Stand with feet shoulder-width apart",
          "Lower your body by bending your knees",
          "Push through your heels to return to standing",
          "Repeat for 45-60 seconds"
        ],
        muscleGroups: ["quads", "hamstrings", "glutes", "core"],
        equipment: []
      }
    ];
  }
};

// Updated function to format exercise for LaMetric Time
// const formatForLaMetric = (exercise) => {
//   return {
//     frames: [
//       {
//         text: "Time to move!",
//         icon: 1273 // Exercise/fitness icon
//       },
//       {
//         text: exercise.name,
//         icon: 2664 // Person icon
//       },
//       {
//         text: exercise.description,
//         icon: 620 // Info icon
//       }
//     ]
//   };
// };

const formatForLaMetric = (exercise) => {
    return {
      frames: [
        {
          text: "Exercise: " + exercise.name,
          icon: 1273
        }
      ]
    };
  };

// Function to format exercise for TRMNL
const formatForTRMNL = (exercise) => {
  // Format instructions as a string
  const instructionsText = exercise.instructions.join(' ');
  
  return {
    message: `Exercise Break: ${exercise.name}`,
    details: `${exercise.description}\n\n${instructionsText}`,
    targetMuscles: exercise.muscleGroups.join(', ')
  };
};

// Function to check if it's time for a new exercise
const shouldProvideExercise = () => {
  // Get current time
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Check if we're at a 45-minute interval (9:00, 9:45, 10:30, etc.)
  return currentMinutes % EXERCISE_INTERVAL_MINUTES <= 5; // Allow a 5-minute window
};

// Main handler function
exports.handler = async (event, context) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const format = queryParams.format || "json"; // Default to JSON
    const muscleGroups = queryParams.muscleGroups ? queryParams.muscleGroups.split(',') : [];
    const equipment = queryParams.equipment ? queryParams.equipment.split(',') : [];
    const forceExercise = queryParams.force === "true"; // For testing - force an exercise regardless of time
    
    // Only provide an exercise if it's the right time or forced
    if (!shouldProvideExercise() && !forceExercise) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allow cross-origin requests
          "Cache-Control": "no-cache" // Ensure fresh data on each request
        },
        body: JSON.stringify({ 
          message: "No exercise scheduled right now.",
          nextExerciseIn: getTimeToNextExercise()
        })
      };
    }
    
    // Get all exercises
    const allExercises = getExercises();
    
    // Filter exercises based on parameters
    let filteredExercises = allExercises;
    
    // Filter by muscle groups if specified
    if (muscleGroups.length > 0) {
      filteredExercises = filteredExercises.filter(exercise => 
        exercise.muscleGroups.some(group => muscleGroups.includes(group))
      );
    }
    
    // Filter by equipment
    // If equipment is specified, include exercises that need any of that equipment OR no equipment
    if (equipment.length > 0) {
      filteredExercises = filteredExercises.filter(exercise => 
        exercise.equipment.length === 0 || 
        exercise.equipment.some(eq => equipment.includes(eq))
      );
    }
    
    // If no exercises match our filters, fall back to exercises that require no equipment
    if (filteredExercises.length === 0) {
      filteredExercises = allExercises.filter(ex => ex.equipment.length === 0);
    }
    
    // Select a random exercise
    const randomIndex = Math.floor(Math.random() * filteredExercises.length);
    const selectedExercise = filteredExercises[randomIndex];
    
    // Format the response based on the requested format
    let responseBody;
    
    if (format === "lametric") {
      responseBody = formatForLaMetric(selectedExercise);
    } else if (format === "trmnl") {
      responseBody = formatForTRMNL(selectedExercise);
    } else {
      // Default JSON format
      responseBody = {
        exercise: selectedExercise,
        timestamp: new Date().toISOString(),
        message: "It's time to exercise!"
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow cross-origin requests
        "Cache-Control": "no-cache" // Ensure fresh data on each request
      },
      body: JSON.stringify(responseBody)
    };
  } catch (error) {
    console.error("Error in getExercise function:", error);
    
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

// Helper function to calculate time to next exercise
function getTimeToNextExercise() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Find the next 45-minute interval (e.g., 9:00, 9:45, 10:30, etc.)
  const minutesUntilNextInterval = EXERCISE_INTERVAL_MINUTES - (currentMinutes % EXERCISE_INTERVAL_MINUTES);
  
  // Return in minutes
  return minutesUntilNextInterval;
}