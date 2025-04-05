# BeHeard Queue Data Dictionary

This document provides a comprehensive overview of the database schema for the BeHeard Queue application.

## Table of Contents
- [Users](#users)
- [Companies](#companies)
- [Stalls](#stalls)
- [Trailers](#trailers)
- [Appointments](#appointments)
- [Haircut Availability](#haircut-availability) (Coming soon...)

## Users

The `users` collection stores information about all users of the system.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for the user |
| email | string | User's email address |
| firstName | string | User's first name |
| lastName | string | User's last name |
| role | string | User's role: 'admin', 'user', or 'software-owner' |
| companyId | string | ID of the company the user belongs to |
| createdAt | Date | Timestamp when the user was created |
| updatedAt | Date | Timestamp when the user was last updated |
| displayName | string (optional) | Optional display name for the user |
| currentCompanyId | string (optional) | ID of the company the user is currently viewing |

### Software Owner

Software owners are a special type of user who can manage multiple companies.

| Field | Type | Description |
|-------|------|-------------|
| companies | string[] | Array of company IDs that the software owner manages |

## Companies

The `companies` collection stores information about companies that provide services.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for the company |
| name | string | Name of the company |
| description | string | Description of the company |
| ownerId | string | ID of the user who owns the company |
| openTime | string | Company's opening time (e.g., "09:00") |
| closeTime | string | Company's closing time (e.g., "17:00") |
| openDays | object | Object indicating which days the company is open |
| maxBookingDays | number (optional) | Maximum number of days users can book in advance |
| availableServices | object | Object indicating which services are available |
| createdAt | Date | Timestamp when the company was created |
| updatedAt | Date | Timestamp when the company was last updated |

### Open Days Structure
```json
{
  "monday": boolean,
  "tuesday": boolean,
  "wednesday": boolean,
  "thursday": boolean,
  "friday": boolean,
  "saturday": boolean,
  "sunday": boolean
}
```

### Available Services Structure
```json
{
  "shower": boolean,
  "laundry": boolean
}
```

## Stalls

The `stalls` collection stores information about individual service stalls.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for the stall |
| name | string | Name of the stall |
| companyId | string | ID of the company the stall belongs to |
| trailerGroup | string | ID of the trailer this stall belongs to |
| status | string | Status of the stall: 'available', 'in_use', 'refreshing', or 'out_of_order' |
| serviceType | string | Type of service provided: 'shower', 'laundry', or 'haircut' |
| createdAt | Date | Timestamp when the stall was created |
| updatedAt | Date | Timestamp when the stall was last updated |

## Trailers

The `trailers` collection stores information about service trailers.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for the trailer |
| name | string | Name of the trailer |
| companyId | string | ID of the company the trailer belongs to |
| startTime | string | Trailer's start time (e.g., "09:00") |
| endTime | string | Trailer's end time (e.g., "17:00") |
| duration | number | Duration of each appointment in minutes |
| bufferTime | number | Buffer time between appointments in minutes |
| slotsPerBlock | number | Number of slots per time block |
| stalls | string[] | Array of stall IDs associated with this trailer |
| location | string | Location of the trailer |
| createdAt | Date | Timestamp when the trailer was created |
| updatedAt | Date | Timestamp when the trailer was last updated |

## Appointments

The `appointments` collection stores information about user appointments.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for the appointment |
| userId | string | ID of the user who made the appointment |
| stallId | string | ID of the stall for the appointment |
| trailerId | string | ID of the trailer for the appointment |
| date | Date | Date of the appointment |
| startTime | string | Start time of the appointment (e.g., "10:00") |
| endTime | string | End time of the appointment (e.g., "10:30") |
| status | string | Status of the appointment: 'scheduled', 'completed', or 'cancelled' |
| createdAt | Date | Timestamp when the appointment was created |
| updatedAt | Date | Timestamp when the appointment was last updated |

### AppointmentWithDetails

An extended appointment object that includes related user, stall, and trailer information.

| Field | Type | Description |
|-------|------|-------------|
| user | User | User object associated with the appointment |
| stall | Stall | Stall object associated with the appointment |
| trailer | Trailer | Trailer object associated with the appointment |

## Haircut Availability

The `haircutAvailability` collection stores information about haircut service availability.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for the haircut availability |
| companyId | string | ID of the company offering the haircut service |
| date | Date | Date of the haircut availability |
| startTime | string | Start time of the haircut availability (e.g., "09:00") |
| endTime | string | End time of the haircut availability (e.g., "17:00") |
| appointmentDuration | number | Duration of each haircut appointment in minutes |
| maxAppointments | number | Maximum number of appointments allowed |
| createdAt | Date | Timestamp when the haircut availability was created |
| updatedAt | Date | Timestamp when the haircut availability was last updated |
