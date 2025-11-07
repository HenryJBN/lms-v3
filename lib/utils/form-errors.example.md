# Form Error Handling Examples

This document shows how to handle Pydantic validation errors from FastAPI in your React forms.

## Pydantic Error Response Formats

### 1. Validation Errors (Field-level)

When Pydantic validation fails, FastAPI returns an array of errors:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    },
    {
      "loc": ["body", "password"],
      "msg": "ensure this value has at least 8 characters",
      "type": "value_error.any_str.min_length"
    }
  ]
}
```

### 2. Business Logic Errors (String)

For custom validation or business logic errors:

```json
{
  "detail": "Email already exists"
}
```

### 3. HTTP Exception Errors

Standard HTTP exceptions:

```json
{
  "detail": "User not found"
}
```

## Usage Examples

### Basic Usage

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { handleApiError } from "@/lib/utils/form-errors"

const MyForm = () => {
  const form = useForm({
    resolver: zodResolver(mySchema),
  })

  const onSubmit = async (data) => {
    try {
      await apiClient.post("/api/endpoint", data)
      toast.success("Success!")
    } catch (error) {
      handleApiError(error, form.setError, {
        defaultMessage: "Failed to submit form",
      })
    }
  }
}
```

### With Field Mapping

If your backend field names differ from frontend:

```tsx
const onSubmit = async (data) => {
  try {
    await apiClient.post("/api/users", data)
  } catch (error) {
    handleApiError(error, form.setError, {
      fieldMap: {
        first_name: "firstName", // backend -> frontend
        last_name: "lastName",
        email_address: "email",
      },
      defaultMessage: "Failed to create user",
    })
  }
}
```

### Without Form (Toast Only)

```tsx
const deleteUser = async (userId: string) => {
  try {
    await apiClient.delete(`/api/users/${userId}`)
    toast.success("User deleted")
  } catch (error) {
    handleApiError(error, undefined, {
      defaultMessage: "Failed to delete user",
    })
  }
}
```

### Manual Error Handling

For more control:

```tsx
import { handleFormErrors, getErrorMessage } from "@/lib/utils/form-errors"

const onSubmit = async (data) => {
  try {
    await apiClient.post("/api/endpoint", data)
  } catch (error) {
    // Try to handle as form errors
    const handled = handleFormErrors(error, form.setError)

    if (!handled) {
      // Custom handling for non-form errors
      const message = getErrorMessage(error, "Something went wrong")
      toast.error(message)
    }
  }
}
```

## Backend (FastAPI) Examples

### Pydantic Model Validation

```python
from pydantic import BaseModel, EmailStr, validator

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

@app.post("/api/users")
async def create_user(user: UserCreate):
    # Pydantic automatically validates and returns errors
    return {"message": "User created"}
```

### Custom Validation Errors

```python
from fastapi import HTTPException, status

@app.post("/api/users")
async def create_user(user: UserCreate):
    # Check if email exists
    if await user_exists(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    # Create user
    return {"message": "User created"}
```

### Multiple Field Errors

```python
from fastapi import HTTPException
from pydantic import ValidationError

@app.post("/api/users")
async def create_user(user: UserCreate):
    errors = []

    if await email_exists(user.email):
        errors.append({
            "loc": ["body", "email"],
            "msg": "Email already exists",
            "type": "value_error"
        })

    if await username_exists(user.username):
        errors.append({
            "loc": ["body", "username"],
            "msg": "Username already taken",
            "type": "value_error"
        })

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=errors
        )

    return {"message": "User created"}
```

## Testing Error Handling

### Mock API Errors in Development

```tsx
// For testing, you can mock API errors
const mockPydanticError = {
  data: {
    detail: [
      {
        loc: ["body", "email"],
        msg: "Invalid email format",
        type: "value_error.email",
      },
    ],
  },
}

const mockStringError = {
  data: {
    detail: "Email already exists",
  },
}

// Test in your component
const onSubmit = async (data) => {
  try {
    // Simulate error
    throw mockPydanticError
  } catch (error) {
    handleApiError(error, form.setError)
  }
}
```

## Common Error Scenarios

### 1. Email Already Exists

**Backend:**

```python
raise HTTPException(
    status_code=400,
    detail="Email already exists"
)
```

**Frontend:** Shows toast with "Email already exists"

### 2. Invalid Email Format

**Backend:** Pydantic automatically validates

```python
email: EmailStr  # Pydantic validates this
```

**Frontend:** Shows error under email field

### 3. Password Too Short

**Backend:**

```python
@validator('password')
def validate_password(cls, v):
    if len(v) < 8:
        raise ValueError('Password must be at least 8 characters')
    return v
```

**Frontend:** Shows error under password field

### 4. Multiple Field Errors

**Backend:** Returns array of errors

**Frontend:** Shows errors under each respective field + toast message

## Best Practices

1. **Always use `handleApiError`** for consistent error handling
2. **Provide meaningful default messages** for better UX
3. **Map field names** when backend and frontend differ
4. **Log errors** for debugging: `console.error(error)`
5. **Show toast notifications** for user feedback
6. **Display field-level errors** for validation issues
7. **Handle network errors** gracefully
