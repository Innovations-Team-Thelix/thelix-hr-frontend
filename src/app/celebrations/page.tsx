"use client";

import React from "react";
import { Cake, Award, PartyPopper, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useCelebrations } from "@/hooks";
import { cn } from "@/lib/utils";

const MILESTONE_YEARS = new Set([1, 2, 3, 5, 10, 15, 20, 25, 30]);

export default function CelebrationsPage() {
  const { data: celebrations, isLoading } = useCelebrations();

  if (isLoading) {
    return (
      <AppLayout pageTitle="Celebrations">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <PartyPopper className="h-6 w-6 text-pink-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Celebrations
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" variant="rectangular" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const hasTodayCelebrations =
    (celebrations?.todayBirthdays?.length || 0) > 0 ||
    (celebrations?.todayAnniversaries?.length || 0) > 0;

  return (
    <AppLayout pageTitle="Celebrations">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <PartyPopper className="h-6 w-6 text-pink-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Celebrations
            </h2>
            <p className="text-sm text-gray-500">
              Birthdays and work anniversaries
            </p>
          </div>
        </div>

        {/* Today's Celebrations */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Today&apos;s Celebrations
          </h3>

          {!hasTodayCelebrations ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PartyPopper className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  No celebrations today
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Today's Birthdays */}
              {celebrations?.todayBirthdays &&
                celebrations.todayBirthdays.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Cake className="h-5 w-5 text-pink-500" />
                        Today&apos;s Birthdays
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {celebrations.todayBirthdays.map((person, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-4 rounded-lg border border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50 p-4"
                          >
                            <Avatar name={person.employeeName} size="md" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                {person.employeeName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {person.department} | {person.sbu}
                              </p>
                            </div>
                            <Cake className="h-6 w-6 text-pink-400" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Today's Anniversaries */}
              {celebrations?.todayAnniversaries &&
                celebrations.todayAnniversaries.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Award className="h-5 w-5 text-amber-500" />
                        Today&apos;s Work Anniversaries
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {celebrations.todayAnniversaries.map((person, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-4 rounded-lg border border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 p-4"
                          >
                            <Avatar name={person.employeeName} size="md" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                {person.employeeName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {person.department} | {person.sbu}
                              </p>
                              <p className="text-sm font-medium text-amber-700">
                                {person.yearsOfService} year
                                {person.yearsOfService !== 1 ? "s" : ""} of
                                service
                              </p>
                            </div>
                            <div className="flex flex-col items-center">
                              <Award className="h-6 w-6 text-amber-500" />
                              {MILESTONE_YEARS.has(person.yearsOfService) && (
                                <Badge variant="warning" className="mt-1">
                                  Milestone
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}
        </section>

        {/* Upcoming Birthdays */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Upcoming Birthdays (Next 30 Days)
          </h3>
          <Card>
            <CardContent className="p-0">
              {!celebrations?.upcomingBirthdays?.length ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No upcoming birthdays in the next 30 days
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>SBU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {celebrations.upcomingBirthdays.map((person, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={person.employeeName} size="sm" />
                            <span className="font-medium text-gray-900">
                              {person.employeeName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{person.department}</TableCell>
                        <TableCell>{person.sbu}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Upcoming Anniversaries */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Upcoming Work Anniversaries (Next 30 Days)
          </h3>
          <Card>
            <CardContent className="p-0">
              {!celebrations?.upcomingAnniversaries?.length ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No upcoming anniversaries in the next 30 days
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>SBU</TableHead>
                      <TableHead>Years</TableHead>
                      <TableHead>Milestone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {celebrations.upcomingAnniversaries.map((person, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={person.employeeName} size="sm" />
                            <span className="font-medium text-gray-900">
                              {person.employeeName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{person.department}</TableCell>
                        <TableCell>{person.sbu}</TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {person.yearsOfService}
                          </span>{" "}
                          year{person.yearsOfService !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell>
                          {MILESTONE_YEARS.has(person.yearsOfService) ? (
                            <Badge variant="warning">
                              <Star className="mr-1 h-3 w-3" />
                              Milestone
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Milestone Anniversaries Highlight */}
        {celebrations?.milestoneAnniversaries &&
          celebrations.milestoneAnniversaries.length > 0 && (
            <section>
              <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Milestone Anniversaries
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {celebrations.milestoneAnniversaries.map((person, i) => (
                  <Card
                    key={i}
                    className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={person.employeeName} size="md" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {person.employeeName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {person.department}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-600">
                            {person.yearsOfService}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-amber-500 font-medium">
                            years
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
      </div>
    </AppLayout>
  );
}
