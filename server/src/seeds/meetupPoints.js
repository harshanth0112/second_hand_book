import { MeetupPoint } from '../models/MeetupPoint.js';

export const INITIAL_MEETUP_POINTS = [
  {
    name: 'Central Library Entrance',
    description: 'Near the turnstiles and security desk on the ground floor',
    area: 'Central Campus',
    active: true,
  },
  {
    name: 'Main Canteen / Food Court',
    description: 'Outside seating area near the main juice counter',
    area: 'Student Centre',
    active: true,
  },
  {
    name: 'Campus Main Gate',
    description: 'Visitor security booth by Gate 1',
    area: 'North Gate',
    active: true,
  },
  {
    name: 'Admin Block Lobby',
    description: 'Front steps of the administrative office building',
    area: 'Admin Complex',
    active: true,
  },
  {
    name: 'Sports Complex Gate',
    description: 'Near the entrance to the gymnasium and stadium',
    area: 'South Campus',
    active: true,
  },
];

export async function seedMeetupPoints() {
  for (const point of INITIAL_MEETUP_POINTS) {
    await MeetupPoint.findOneAndUpdate(
      { name: point.name },
      { $set: point },
      { upsert: true, new: true }
    );
  }
}

