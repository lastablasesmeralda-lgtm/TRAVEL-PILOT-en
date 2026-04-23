import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  description: string;
  status: 'past' | 'current' | 'future' | 'alert';
};

const Timeline = ({ events }: { events: TimelineEvent[] }) => {
  return (
    <View style={styles.container}>
      {events.map((event, index) => (
        <View key={event.id} style={styles.eventContainer}>
          {/* Timeline Line & Dot */}
          <View style={styles.timelineGraphic}>
            <View
              style={[
                styles.dot,
                event.status === 'past' ? styles.dotPast : null,
                event.status === 'current' ? styles.dotCurrent : null,
                event.status === 'alert' ? styles.dotAlert : null,
              ]}
            />
            {index < events.length - 1 && <View style={styles.line} />}
          </View>

          {/* Event Content */}
          <View style={styles.content}>
            <Text style={styles.time}>{event.time}</Text>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#111',
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  timelineGraphic: {
    alignItems: 'center',
    marginRight: 20,
    width: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#000',
  },
  dotPast: {
    backgroundColor: '#4CD964',
  },
  dotCurrent: {
    backgroundColor: '#AF52DE',
    transform: [{ scale: 1.4 }],
    shadowColor: '#AF52DE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  dotAlert: {
    backgroundColor: '#FF3B30',
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: '#222',
    position: 'absolute',
    top: 12,
    bottom: -25,
  },
  content: {
    flex: 1,
  },
  time: {
    fontSize: 10,
    color: '#AF52DE',
    fontWeight: '900',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    color: '#666',
    lineHeight: 14,
  },
});

export default Timeline;
export { Timeline };
