export function createResponse(data, message = "Success", status = 200) {
  return Response.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function createError(message = "An error occurred", status = 400, errors = null) {
  return Response.json(
    {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export async function handleApiRequest(handler) {
  try {
    return await handler();
  } catch (error) {
    console.error("API Error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return createError("Validation failed", 422, errors);
    }

    if (error.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0];
      return createError(
        `${key ? key.charAt(0).toUpperCase() + key.slice(1) : "Record"} already exists`,
        409
      );
    }

    if (error.name === "CastError") {
      return createError("Invalid record ID", 400);
    }

    return createError(
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message || "Internal server error",
      500
    );
  }
}

export function validateBody(schema) {
  return async (req) => {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch {
      throw createError("Invalid request body", 400);
    }
  };
}
