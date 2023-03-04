import {
  createStyles,
  Card,
  Avatar,
  Text,
  Group,
  Button,
  Modal,
  Accordion,
  List,
  Stack,
  Title,
  Table,
  LoadingOverlay,
  Popover,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useContext, useState } from 'react';
import { AlertCircle, Minus, Plus, World } from 'tabler-icons-react';
import {
  GRAPHQL_API_KEY,
  GRAPHQL_ENDPOINT,
  GRAPHQL_QUERY,
  mantineGray,
  PICKS_PER_EVT,
} from './const';
import { Store } from './Store';
import { AthleticsEvent, Competitor, DLMeet, Entrant, ResultsByYearResult } from './types';
import { isTouchDevice } from './util';

interface AthleteCardProps {
  avatar: string;
  name: string;
  job: string;
  stats: { label: string; value: string }[];
  event: AthleticsEvent;
  meet: DLMeet;
  entrant: Entrant;
}

function nth(n: string) {
  const num = Number.parseInt(n);
  return ['st', 'nd', 'rd'][((((num + 90) % 100) - 10) % 10) - 1] || 'th';
}

export function AthleteCard({ avatar, name, job, stats, event, meet, entrant }: AthleteCardProps) {
  const { myTeam, setMyTeam } = useContext(Store);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [popOpened, { close: popClose, open: popOpen }] = useDisclosure(false);

  const team = myTeam?.[meet]?.[event] ?? [];
  const isOnTeam = !!team.find((member) => member.id === entrant.id);

  const items = stats.map((stat) => (
    <div key={stat.label}>
      <Text align="center" size="lg" weight={500}>
        {stat.value}
      </Text>
      <Text align="center" size="sm" color="dimmed">
        {stat.label}
      </Text>
    </div>
  ));

  const sideButtonMinWidth = isTouchDevice() ? 0 : 300;

  return (
    <>
      <Modal
        size={isTouchDevice() ? '98%' : '90%'}
        title={
          <Group sx={{ width: '100%' }} position="apart">
            <Title variant="gradient" gradient={{ from: 'gray', to: 'white' }} order={1}>
              {entrant.firstName} {entrant.lastName.toUpperCase()}
            </Title>
          </Group>
        }
        opened={showDetails}
        onClose={() => setShowDetails(false)}
      >
        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={!competitor} overlayBlur={2} />
          <Stack align="center">
            <Button.Group>
              <Button
                sx={{ height: 128, minWidth: sideButtonMinWidth, borderRight: 'none' }}
                variant="outline"
                leftIcon={
                  isOnTeam ? <Minus /> : team.length < PICKS_PER_EVT ? <Plus /> : <AlertCircle />
                }
                // disabled={!isOnTeam && (myTeam[meet]?.[event]?.length ?? 0) >= PICKS_PER_EVT}
                radius="xl"
                size="xl"
                color={isOnTeam ? 'red' : undefined}
                onClick={(evt) => {
                  evt.stopPropagation();
                  if (!isOnTeam && (myTeam[meet]?.[event]?.length ?? 0) >= PICKS_PER_EVT) return;
                  setMyTeam({
                    ...myTeam,
                    [meet]: {
                      ...myTeam[meet],
                      [event]: isOnTeam
                        ? myTeam[meet]![event]?.filter((member) => member.id !== entrant.id)
                        : [...(myTeam[meet]?.[event] ?? []), entrant],
                    },
                  });
                }}
              >
                {(() => {
                  if (isTouchDevice()) return '';
                  if (isOnTeam) return 'Remove from Team';
                  if (team.length === 0) return 'Add as Event Captain';
                  if (team.length === 1) return 'Add as Secondary';
                  if (team.length < PICKS_PER_EVT) return 'Add as Backup Athlete';
                  return 'Team Full';
                })()}
              </Button>
              <Button
                color="green"
                sx={{ height: 128, borderLeft: 'none', borderRight: 'none' }}
                variant="outline"
              >
                <Avatar variant="outline" bg="gray" size={128} radius={128} src={avatar} />
              </Button>
              <Button
                size="xl"
                sx={{ height: 128, minWidth: sideButtonMinWidth, borderLeft: 'none' }}
                variant="outline"
                radius="xl"
                leftIcon={<World />}
                onClick={() =>
                  window.open(`https://worldathletics.org/athletes/_/${entrant.id}`, '_blank')
                }
              >
                {isTouchDevice() ? '' : 'World Athletics'}
              </Button>
            </Button.Group>
            <Title order={2}>Personal Bests</Title>
            <Table
              sx={{ textAlign: 'left' }}
              fontSize="lg"
              striped
              highlightOnHover
              withBorder
              withColumnBorders
            >
              <tbody>
                {competitor?.personalBests.results.map(
                  ({ indoor, discipline, mark, notLegal, venue, date, resultScore }, i) => {
                    return (
                      <tr key={i}>
                        <td>
                          {indoor ? 'Indoor' : ''} {discipline}
                        </td>
                        <td>
                          {mark}
                          {notLegal ? '*' : ''} ({date})
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </Table>
            <Title order={2}>{competitor?.resultsByYear?.activeYears[0]} Results</Title>
            <Accordion multiple variant="contained" sx={{ width: '100%' }}>
              {competitor &&
                Object.entries(
                  competitor.resultsByYear.resultsByEvent.reduce(
                    (acc, { indoor, discipline, results }) => {
                      acc[discipline] ??= [];
                      acc[discipline].push(...results);
                      return acc;
                    },
                    {} as { [k: string]: ResultsByYearResult[] }
                  )
                ).map(([discipline, results]) => (
                  <Accordion.Item key={discipline} value={discipline}>
                    <Accordion.Control>{discipline}</Accordion.Control>
                    <Accordion.Panel>
                      <List>
                        {results
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map(({ date, venue, place, mark, wind, notLegal }, i) => (
                            <List.Item key={i}>
                              {date.split(' ').slice(0, -1).join(' ')}:{' '}
                              <span style={{ fontWeight: 'bold' }}>
                                {Number.parseInt(place)
                                  ? `${Number.parseInt(place)}${nth(place)} place, `
                                  : ''}
                                {mark}
                              </span>
                              {notLegal ? '*' : ''} {wind ? `(${wind})` : ''} @ {venue}
                            </List.Item>
                          ))}
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
            </Accordion>
          </Stack>
        </div>
      </Modal>
      <Popover width={200} position="bottom" withArrow shadow="md" opened={popOpened}>
        <Popover.Target>
          <Avatar
            onMouseEnter={popOpen}
            onMouseLeave={popClose}
            onClick={async () => {
              setShowDetails(true);
              if (!competitor) {
                const { competitor: competitorResp } = (
                  await (
                    await fetch(GRAPHQL_ENDPOINT, {
                      headers: { 'x-api-key': GRAPHQL_API_KEY },
                      body: JSON.stringify({
                        operationName: 'GetCompetitorBasicInfo',
                        query: GRAPHQL_QUERY,
                        variables: { id: entrant.id },
                      }),
                      method: 'POST',
                    })
                  ).json()
                ).data;
                setCompetitor(competitorResp);
              }
            }}
            src={avatar}
            size={128}
            radius={128}
            mx="auto"
            sx={{ border: `1px solid ${mantineGray}`, cursor: 'pointer' }}
          />
        </Popover.Target>
        <Popover.Dropdown sx={{ display: isTouchDevice() ? 'none' : undefined }}>
          <Text align="center" size="lg" weight={500} mt="sm">
            {name}
          </Text>
          <Text align="center" size="sm" color="dimmed">
            {entrant.team ? `${entrant.team} (${job})` : job}
          </Text>
          <Group mt="md" position="center" spacing={30}>
            {items}
          </Group>
        </Popover.Dropdown>
      </Popover>
    </>
  );
}
